// Plan definitions (USD, monthly recurring via Stripe Checkout)
// prices use Stripe price_data so no manual Price/Product setup is needed.

const plans = [
    {
        code: "free",
        name: "Free",
        price: 0,
        priceLabel: "$0",
        interval: "month",
        description: "For trying out AI CallHub",
        features: [
            "1 AI Agent",
            "20 call minutes / month",
            "Email support"
        ],
        cta: "Get Started"
    },
    {
        code: "pro",
        name: "Pro",
        price: 9,
        priceLabel: "$9",
        interval: "month",
        description: "For growing teams",
        features: [
            "Unlimited AI Agents",
            "500 call minutes / month",
            "Transcripts & summaries",
            "Priority support"
        ],
        cta: "Subscribe"
    },
    {
        code: "enterprise",
        name: "Enterprise",
        price: 49,
        priceLabel: "$49",
        interval: "month",
        description: "For large call volumes",
        features: [
            "Unlimited agents & minutes",
            "Advanced analytics",
            "Dedicated account manager",
            "Custom AI fine-tuning"
        ],
        cta: "Subscribe"
    }
];

module.exports = plans;