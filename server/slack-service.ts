/**
 * Slack webhook service for sending feedback notifications
 */

interface FeedbackData {
  message: string;
  category?: string;
  userEmail?: string;
  userName?: string;
  pageUrl?: string;
  browserInfo?: string;
}

// Category emoji mapping
const CATEGORY_EMOJI: Record<string, string> = {
  bug: ":bug:",
  feature: ":bulb:",
  general: ":speech_balloon:",
  other: ":memo:",
};

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
  bug: "Bug Report",
  feature: "Feature Request",
  general: "General Feedback",
  other: "Other",
};

/**
 * Send feedback notification to Slack via webhook
 * This is a fire-and-forget function - errors are logged but don't throw
 */
export async function sendFeedbackToSlack(feedback: FeedbackData): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log("[Slack] Webhook URL not configured, skipping notification");
    return false;
  }

  try {
    const category = feedback.category || "general";
    const emoji = CATEGORY_EMOJI[category] || ":speech_balloon:";
    const categoryLabel = CATEGORY_LABELS[category] || "Feedback";

    // Build user info
    let userInfo = "Anonymous";
    if (feedback.userName && feedback.userEmail) {
      userInfo = `${feedback.userName} (${feedback.userEmail})`;
    } else if (feedback.userEmail) {
      userInfo = feedback.userEmail;
    } else if (feedback.userName) {
      userInfo = feedback.userName;
    }

    // Current timestamp
    const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";

    // Build Slack message with Block Kit
    const slackMessage = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${emoji} New Feedback from Translation Helper`,
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Category:*\n${categoryLabel}`,
            },
            {
              type: "mrkdwn",
              text: `*User:*\n${userInfo}`,
            },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Message:*\n> ${feedback.message.replace(/\n/g, "\n> ")}`,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `*Time:* ${timestamp}${feedback.pageUrl ? ` | *Page:* ${feedback.pageUrl}` : ""}${feedback.browserInfo ? ` | *Browser:* ${feedback.browserInfo.substring(0, 100)}` : ""}`,
            },
          ],
        },
        {
          type: "divider",
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(slackMessage),
    });

    if (response.ok) {
      console.log("[Slack] Feedback notification sent successfully");
      return true;
    } else {
      console.error(`[Slack] Failed to send notification: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error("[Slack] Error sending feedback notification:", error);
    return false;
  }
}
