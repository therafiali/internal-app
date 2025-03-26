interface ManyChatMessage {
  type: string;
  text: string;
}

interface SendMessageParams {
  subscriberId: string;
  message?: string;
  messages?: ManyChatMessage[];
  customFields?: Record<string, any>;
  teamCode: string;
}

export const sendManyChatMessage = async ({
  subscriberId,
  message,
  messages,
  customFields,
  teamCode
}: SendMessageParams) => {
  try {
    // Map team code to ENT format
    let ent: 'ENT1' | 'ENT2' | 'ENT3';
    switch (teamCode) {
      case 'ENT-1':
        ent = 'ENT1';
        break;
      case 'ENT-2':
        ent = 'ENT2';
        break;
      case 'ENT-3':
        ent = 'ENT3';
        break;
      default:
        throw new Error(`Invalid team code format: ${teamCode}. Expected ENT-1, ENT-2, or ENT-3`);
    }

    const response = await fetch('/api/manychat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscriberId,
        message,
        messages,
        customFields,
        ent
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send message');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending ManyChat message:', error);
    throw error;
  }
};

// Predefined message templates
export const MANYCHAT_TEMPLATES = {
  REDEEM_REQUEST_CREATED: (amount: number, platform: string, redeemId: string) => 
    `✅ Redeem ID: ${redeemId}\n\nYour redeem request for $${amount} on ${platform} has been submitted successfully! We'll process it shortly. 🎮💰`,
  
  REDEEM_REQUEST_APPROVED: (amount: number, redeemId: string, platform: string) =>
    `✅ Redeem ID: ${redeemId}\n\nThe credits have been removed from your ${platform} account and your request has been sent for processing.`,
  
  REDEEM_REQUEST_REJECTED: (redeemId: string, reason?: string) =>
    `❌ Redeem ID: ${redeemId}\n\nWe're sorry, but your redeem request has been rejected. ${reason ? `Reason: ${reason}` : 'Please contact support for more information.'}`,

  VERIFICATION_APPROVED: (amount: number, redeemId: string, platform: string) =>
    `✅ Redeem ID: ${redeemId}\n\nYour redeem request for $${amount} on ${platform} has been processed and added to the queue. You will start receiving it shortly.`,

  RECHARGE_VERIFICATION_WITH_REDEEM: (amount: number, redeemId: string, platform: string) =>
    `✅ Your amount has been processed!\n\n💰 Amount: $${amount}\n🎮 Platform: ${platform}\n🆔 Redeem ID: ${redeemId}\n\nThis amount has been applied to your redeem request. Thank you for your patience! `,

  PAYMENT_PROCESSED: (amount: number, redeemId: string, paidAmount: number, remainingAmount: number) =>
    `🎉 💰  Payment Completed!\n\n🆔 Redeem ID: ${redeemId}\n💵 Total Amount: $${amount}\n\n  💰 Paid Amount: $${remainingAmount}\n\n⏳ Remaining Amount: $${paidAmount}\n\n Thank you for your patience.`,

  REQUEST_PAUSED: (redeemId: string, reason?: string) =>
    `⏸️ Request Paused\n\n🆔 Redeem ID: ${redeemId}\n\nYour redeem request has been temporarily paused. ${reason ? `\n\nReason: ${reason}` : ''}\n\nWe'll notify you once it's resumed.`,

  REQUEST_RESUMED: (redeemId: string) =>
    `▶️ Request Resumed\n\n🆔 Redeem ID: ${redeemId}\n\nGood news! Your redeem request has been resumed and is now being processed.`,

  PARTIAL_PAYMENT: (amount: number, redeemId: string, paidAmount: number, remainingAmount: number) =>
    `💰 Partial Payment Processed!\n\n🆔 Redeem ID: ${redeemId}\n💵 Total Amount: $${amount}\n\n  💰 Paid Amount: $${paidAmount}\n\n⏳ Remaining Amount: $${remainingAmount}\n\nWe'll process the remaining amount shortly.`
}; 