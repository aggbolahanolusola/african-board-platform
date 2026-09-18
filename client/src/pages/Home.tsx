import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, 
  FileText, 
  Users, 
  Shield, 
  Zap, 
  Globe, 
  CheckCircle,
  ArrowRight,
  Leaf
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [justLoggedOut, setJustLoggedOut] = useState(false);

  // Handle authentication redirects in useEffect, not in render phase
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, user, navigate]);

  // Check if user just logged out
  useEffect(() => {
    if (typeof window !== "undefined" && !justLoggedOut && localStorage.getItem("just_logged_out")) {
      setJustLoggedOut(true);
      localStorage.removeItem("just_logged_out");
    }
  }, [justLoggedOut]);

  // Show loading state while redirecting
  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-md border-b border-border z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="NurtGov" className="w-8 h-8" />
            <span className="text-xl font-display text-primary">NurtGov</span>
          </div>
          <div className="flex items-center gap-3">
            <a href={getLoginUrl()}>
              <Button variant="ghost" className="text-foreground hover:text-primary">
                Sign In
              </Button>
            </a>
            <a href="/signup">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Sign Up
              </Button>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 pattern-african">
        <div className="container max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full">
                <Leaf className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-accent">Nurture Governance Excellence</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-display text-foreground leading-tight">
                Board Governance,{" "}
                <span className="text-gradient-african">Nurtured for Africa</span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-lg">
                NurtGov is the comprehensive board management platform designed specifically for African organizations. Streamline meetings, ensure compliance with King IV, OHADA, POPIA, and NDPR, and govern with confidence.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <a href="/signup">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Watch Demo
                </Button>
              </div>
              
              <div className="flex items-center gap-8 pt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-accent" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-accent" />
                  <span>14-day free trial</span>
                </div>
              </div>
            </div>
            
            {/* Right Visual */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-african rounded-2xl blur-3xl opacity-20"></div>
              <div className="relative bg-card border border-border rounded-2xl p-8 shadow-african">
                <img src="/logo.png" alt="NurtGov Logo" className="w-full max-w-sm mx-auto" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display text-foreground mb-4">
              Comprehensive Governance Platform
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage board meetings, ensure compliance, and govern effectively across African jurisdictions.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Calendar,
                title: "Smart Meeting Management",
                description: "Schedule, manage, and track board meetings with multi-timezone support across African regions.",
                color: "primary"
              },
              {
                icon: FileText,
                title: "Document Management",
                description: "Secure storage, versioning, and permissions for board packs, resolutions, and governance documents.",
                color: "accent"
              },
              {
                icon: Shield,
                title: "Compliance Tracking",
                description: "Automated compliance monitoring for King IV, OHADA, POPIA, and NDPR requirements.",
                color: "secondary"
              },
              {
                icon: Users,
                title: "Role-Based Access",
                description: "Manage board members, secretaries, and administrators with granular permission controls.",
                color: "primary"
              },
              {
                icon: Zap,
                title: "Electronic Voting",
                description: "Secure voting and resolution approval with complete audit trails for board decisions.",
                color: "accent"
              },
              {
                icon: Globe,
                title: "Regional Data Residency",
                description: "Enterprise-grade security with data residency compliance for African markets.",
                color: "secondary"
              }
            ].map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card key={idx} className="border-border hover:border-accent/50 transition-colors card-hover">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                      feature.color === "primary" ? "bg-primary/10 text-primary" :
                      feature.color === "accent" ? "bg-accent/10 text-accent" :
                      "bg-secondary/10 text-secondary"
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display text-foreground mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your organization's needs. Upgrade anytime.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Starter",
                price: "$49",
                period: "/month",
                description: "Perfect for small boards",
                features: [
                  "Up to 5 board members",
                  "Monthly meetings",
                  "Basic document management",
                  "Email notifications",
                  "Standard compliance tracking"
                ],
                cta: "Start Free Trial",
                highlighted: false
              },
              {
                name: "Professional",
                price: "$149",
                period: "/month",
                description: "For growing organizations",
                features: [
                  "Up to 25 board members",
                  "Unlimited meetings",
                  "Advanced document management",
                  "Live transcription",
                  "Full compliance dashboard",
                  "Digital signatures",
                  "Board assessments",
                  "Priority support"
                ],
                cta: "Start Free Trial",
                highlighted: true
              },
              {
                name: "Enterprise",
                price: "Custom",
                period: "pricing",
                description: "For large enterprises",
                features: [
                  "Unlimited board members",
                  "Unlimited everything",
                  "Custom integrations",
                  "Dedicated account manager",
                  "Advanced security features",
                  "Data residency options",
                  "SLA guarantee",
                  "Custom training"
                ],
                cta: "Contact Sales",
                highlighted: false
              }
            ].map((plan, idx) => (
              <Card 
                key={idx} 
                className={`border-2 transition-all ${
                  plan.highlighted 
                    ? "border-accent bg-gradient-to-br from-accent/5 to-primary/5 shadow-african" 
                    : "border-border"
                }`}
              >
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="pt-4">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground ml-2">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, fidx) => (
                      <li key={fidx} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <a href={getLoginUrl()}>
                    <Button 
                      className="w-full"
                      variant={plan.highlighted ? "default" : "outline"}
                    >
                      {plan.cta}
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 gradient-african">
        <div className="container max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl md:text-5xl font-display mb-6">
            Ready to Transform Your Board Governance?
          </h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Join African organizations that trust NurtGov for secure, compliant, and efficient board management.
          </p>
          <a href={getLoginUrl()}>
            <Button size="lg" className="bg-white text-primary hover:bg-white/90">
              Start Your Free Trial Today
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 bg-card/50">
        <div className="container max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.png" alt="NurtGov" className="w-6 h-6" />
                <span className="font-display text-primary">NurtGov</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Board governance, nurtured for Africa.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Features</a></li>
                <li><a href="#" className="hover:text-primary">Pricing</a></li>
                <li><a href="#" className="hover:text-primary">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">About</a></li>
                <li><a href="#" className="hover:text-primary">Blog</a></li>
                <li><a href="#" className="hover:text-primary">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Privacy</a></li>
                <li><a href="#" className="hover:text-primary">Terms</a></li>
                <li><a href="#" className="hover:text-primary">Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2026 NurtGov. All rights reserved. Nurturing Governance Excellence in Africa.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
