import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Crown } from "lucide-react";
import { getLoginUrl } from "@/const";

export default function Pricing() {
  const plans = [
    {
      name: "Starter",
      slug: "starter",
      monthlyPrice: 49,
      yearlyPrice: 490,
      description: "Perfect for small boards getting started",
      features: [
        { name: "Up to 5 board members", included: true },
        { name: "Monthly meetings", included: true },
        { name: "Basic document management", included: true },
        { name: "Email notifications", included: true },
        { name: "Standard compliance tracking", included: true },
        { name: "Live transcription", included: false },
        { name: "Digital signatures", included: false },
        { name: "Board assessments", included: false },
        { name: "Priority support", included: false },
      ],
      cta: "Start Free Trial",
      highlighted: false,
    },
    {
      name: "Professional",
      slug: "professional",
      monthlyPrice: 149,
      yearlyPrice: 1490,
      description: "For growing organizations",
      features: [
        { name: "Up to 25 board members", included: true },
        { name: "Unlimited meetings", included: true },
        { name: "Advanced document management", included: true },
        { name: "Email notifications", included: true },
        { name: "Full compliance dashboard", included: true },
        { name: "Live transcription", included: true },
        { name: "Digital signatures", included: true },
        { name: "Board assessments", included: true },
        { name: "Priority support", included: true },
      ],
      cta: "Get Started",
      highlighted: true,
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      monthlyPrice: null,
      yearlyPrice: null,
      description: "For large organizations",
      features: [
        { name: "Unlimited board members", included: true },
        { name: "Unlimited everything", included: true },
        { name: "Custom integrations", included: true },
        { name: "Dedicated account manager", included: true },
        { name: "Advanced security features", included: true },
        { name: "Data residency options", included: true },
        { name: "SLA guarantee", included: true },
        { name: "Custom training", included: true },
        { name: "24/7 support", included: true },
      ],
      cta: "Contact Sales",
      highlighted: false,
    },
  ];

  const faqs = [
    {
      question: "Can I change my plan anytime?",
      answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.",
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards (Visa, Mastercard, American Express) and bank transfers for Enterprise plans.",
    },
    {
      question: "Is there a free trial?",
      answer: "Yes, all plans come with a 14-day free trial. No credit card required to start.",
    },
    {
      question: "What happens when I exceed my plan limits?",
      answer: "We'll notify you when you're approaching your limits. You can upgrade anytime to get higher limits.",
    },
    {
      question: "Do you offer discounts for annual billing?",
      answer: "Yes, annual plans are discounted by 15% compared to monthly billing.",
    },
    {
      question: "Is data residency included in all plans?",
      answer: "Regional data residency is available on Professional and Enterprise plans. Contact us for details.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">N</span>
            </div>
            <span className="font-bold text-lg text-foreground">NurtGov</span>
          </div>
          <div className="flex items-center gap-4">
            <Button size="sm" asChild>
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="container py-20 text-center">
        <h1 className="text-5xl font-bold text-foreground mb-4">Simple, Transparent Pricing</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Choose the perfect plan for your organization. All plans include a 14-day free trial.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="container py-20">
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card key={plan.slug} className={`relative flex flex-col ${plan.highlighted ? 'ring-2 ring-primary shadow-xl md:scale-105' : ''}`}>
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1 whitespace-nowrap">
                    <Crown className="w-4 h-4" />
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-6">
                <div>
                  {plan.monthlyPrice ? (
                    <>
                      <div className="text-4xl font-bold text-foreground">${plan.monthlyPrice}</div>
                      <p className="text-sm text-muted-foreground">per month, billed monthly</p>
                      {plan.yearlyPrice && (
                        <p className="text-sm text-accent mt-1">or ${plan.yearlyPrice} billed yearly (save 15%)</p>
                      )}
                    </>
                  ) : (
                    <div className="text-3xl font-bold text-foreground">Custom Pricing</div>
                  )}
                </div>
                <Button className="w-full" variant={plan.highlighted ? "default" : "outline"} asChild>
                  <a href={getLoginUrl()}>{plan.cta}</a>
                </Button>
                <div className="space-y-3 flex-1">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${feature.included ? 'text-green-500' : 'text-muted-foreground opacity-30'}`} />
                      <span className={`text-sm ${feature.included ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="container py-20">
        <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Detailed Feature Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-4 px-4 font-semibold text-foreground">Feature</th>
                <th className="text-center py-4 px-4 font-semibold text-foreground">Starter</th>
                <th className="text-center py-4 px-4 font-semibold text-foreground">Professional</th>
                <th className="text-center py-4 px-4 font-semibold text-foreground">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "Board Members", starter: "5", professional: "25", enterprise: "Unlimited" },
                { name: "Meetings", starter: "Limited", professional: "Unlimited", enterprise: "Unlimited" },
                { name: "Document Storage", starter: "10 GB", professional: "100 GB", enterprise: "Custom" },
                { name: "Meeting Transcription", starter: "No", professional: "Yes", enterprise: "Yes" },
                { name: "Digital Signatures", starter: "No", professional: "Yes", enterprise: "Yes" },
                { name: "Compliance Tracking", starter: "Basic", professional: "Full", enterprise: "Full" },
                { name: "Board Assessments", starter: "No", professional: "Yes", enterprise: "Yes" },
                { name: "API Access", starter: "No", professional: "Yes", enterprise: "Yes" },
                { name: "Custom Integrations", starter: "No", professional: "Limited", enterprise: "Yes" },
                { name: "Data Residency", starter: "No", professional: "Yes", enterprise: "Yes" },
                { name: "Support", starter: "Email", professional: "Priority", enterprise: "24/7 Dedicated" },
              ].map((row, idx) => (
                <tr key={idx} className="border-b border-border hover:bg-accent/5 transition">
                  <td className="py-4 px-4 font-medium text-foreground">{row.name}</td>
                  <td className="py-4 px-4 text-center text-muted-foreground">{row.starter}</td>
                  <td className="py-4 px-4 text-center text-foreground font-medium">{row.professional}</td>
                  <td className="py-4 px-4 text-center text-foreground font-medium">{row.enterprise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container py-20">
        <h2 className="text-3xl font-bold text-foreground mb-12 text-center">Frequently Asked Questions</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {faqs.map((faq, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle className="text-lg">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-20 text-center">
        <h2 className="text-4xl font-bold text-foreground mb-6">Ready to Get Started?</h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Start your 14-day free trial today. No credit card required.
        </p>
        <Button size="lg" asChild>
          <a href={getLoginUrl()}>Start Free Trial</a>
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background/50 backdrop-blur-sm py-12">
        <div className="container text-center text-sm text-muted-foreground">
          <p>&copy; 2026 NurtGov. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
