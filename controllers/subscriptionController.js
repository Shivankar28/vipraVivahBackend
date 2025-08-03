const Subscription = require('../models/Subscription');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const crypto = require("crypto"); 
const Razorpay = require("razorpay");
require("dotenv").config();


// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_ID_KEY,
    key_secret: process.env.RAZORPAY_SECRET_KEY
});

// Create Razorpay Order
const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find user's subscription
    let subscription = await Subscription.findOne({ userId });
    if (!subscription) {
      console.log("CreateOrder: Subscription not found", { userId });
      return res
        .status(404)
        .json(new ApiResponse(404, "Subscription not found"));
    }

    // Check if already premium and active
    if (
      subscription.plan === "premium" &&
      subscription.status === "active" &&
      subscription.subscriptionEnd > new Date()
    ) {
      console.log("CreateOrder: User already on active premium plan", {
        userId,
      });
      return res
        .status(400)
        .json(
          new ApiResponse(400, "User is already on an active premium plan")
        );
    }

    // Generate a shorter receipt (max 40 characters)
    const shortUserId = userId.toString().substring(0, 20); // Truncate userId to 20 chars
    const shortTimestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const receipt = `rcpt_${shortUserId}_${shortTimestamp}`.substring(0, 40); // Ensure max 40 chars

    // Razorpay order options
    const options = {
      amount: 100,
      currency: "INR",
      receipt: receipt,
      payment_capture: 1, // Auto-capture payment
    };

    const order = await razorpay.orders.create(options);
    console.log("CreateOrder: Order created successfully", {
      userId,
      orderId: order.id,
    });

    res.status(200).json(
      new ApiResponse(200, "Order created successfully", {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_ID_KEY,
      })
    );
  } catch (error) {
    console.error("CreateOrder: Error occurred", error);
    res
      .status(500)
      .json(new ApiResponse(500, "Error creating order", null, error.message));
  }
};

// Verify Payment and Upgrade to Premium
const upgradeToPremium = async (req, res) => {
   console.log("00000000000000000000000000000");
    console.log('UpgradeToPremium: Request received', { userId: req.user.id });
    try {
        const userId = req.user.id;
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

        // Find user's subscription
        let subscription = await Subscription.findOne({ userId });
        if (!subscription) {
            console.log('UpgradeToPremium: Subscription not found', { userId });
            return res.status(404).json(new ApiResponse(404, 'Subscription not found'));
        }

        // Check if premium subscription has expired
        if (subscription.plan === 'premium' && subscription.subscriptionEnd < new Date()) {
            console.log('UpgradeToPremium: Premium subscription expired, reverting to free', { userId });
            subscription.plan = 'free';
            subscription.status = 'inactive';
            subscription.subscriptionEnd = null;
            await subscription.save();
        }

        // Check if already premium
        if (subscription.plan === 'premium' && subscription.status === 'active') {
            console.log('UpgradeToPremium: User already on premium plan', { userId });
            return res.status(400).json(new ApiResponse(400, 'User is already on a premium plan'));
        }

        // Verify Razorpay signature
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_SECRET_KEY)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            console.log('UpgradeToPremium: Invalid signature', { userId });
            return res.status(400).json(new ApiResponse(400, 'Invalid payment signature'));
        }

        // Verify payment status with Razorpay
        const payment = await razorpay.payments.fetch(razorpay_payment_id);
        if (payment.status !== 'captured') {
            console.log('UpgradeToPremium: Payment not captured', { userId, paymentStatus: payment.status });
            return res.status(400).json(new ApiResponse(400, 'Payment not captured'));
        }

        // Update to premium
        const subscriptionStart = new Date();
        const subscriptionEnd = new Date(subscriptionStart);
        subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1); // 1-month subscription
        subscription.plan = 'premium';
        subscription.status = 'active';
        subscription.subscriptionStart = subscriptionStart;
        subscription.subscriptionEnd = subscriptionEnd;
        subscription.razorpayOrderId = razorpay_order_id;
        subscription.razorpayPaymentId = razorpay_payment_id;
        await subscription.save();

        console.log('UpgradeToPremium: Subscription upgraded to premium', { userId });
        res.status(200).json(new ApiResponse(200, 'Successfully upgraded to premium', { subscription }));
    } catch (error) {
        console.error('UpgradeToPremium: Error occurred', error);
        res.status(500).json(new ApiResponse(500, 'Error upgrading subscription', null, error.message));
    }
};

// Get subscription status
const getSubscriptionStatus = async (req, res) => {
   console.log('GetSubscriptionStatus: Request received', { userId: req.user.id });
   try {
      const userId = req.user.id;
      const subscription = await Subscription.findOne({ userId }).populate('userId', 'email');
      if (!subscription) {
         console.log('GetSubscriptionStatus: Subscription not found', { userId });
         return res.status(404).json(new ApiResponse(404, 'Subscription not found'));
      }

      // Check if premium subscription has expired
      if (subscription.plan === 'premium' && subscription.subscriptionEnd < new Date()) {
         console.log('GetSubscriptionStatus: Premium subscription expired, reverting to free', { userId });
         subscription.plan = 'free';
         subscription.status = 'inactive';
         subscription.subscriptionEnd = null;
         await subscription.save();
      }

      console.log('GetSubscriptionStatus: Subscription retrieved', { userId, plan: subscription.plan });
      res.status(200).json(new ApiResponse(200, 'Subscription status retrieved', { subscription }));
   } catch (error) {
      console.error('GetSubscriptionStatus: Error occurred', error);
      res.status(500).json(new ApiResponse(500, 'Error retrieving subscription status', null, error.message));
   }
};

module.exports = {
  upgradeToPremium,
  getSubscriptionStatus,
  createOrder
};