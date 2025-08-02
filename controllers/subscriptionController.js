const Subscription = require('../models/Subscription');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

// Upgrade to premium subscription
const upgradeToPremium = async (req, res) => {
   console.log('UpgradeToPremium: Request received', { userId: req.user.id });
   try {
      const userId = req.user.id;

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

      // Update to premium (mock payment processing)
      const subscriptionStart = new Date();
      const subscriptionEnd = new Date(subscriptionStart);
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1); // 1-month subscription
      subscription.plan = 'premium';
      subscription.status = 'active';
      subscription.subscriptionStart = subscriptionStart;
      subscription.subscriptionEnd = subscriptionEnd;
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
};