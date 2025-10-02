import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogIn, Sparkles, TrendingUp, Shield, Zap } from "lucide-react";
import { LegalFooter } from "@/components/legal/LegalFooter";
interface LandingPageProps {
  onGetStarted: () => void;
}
export default function LandingPage({
  onGetStarted
}: LandingPageProps) {
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 flex flex-col">
      <div className="flex-1">
        <div className="container mx-auto px-4 py-12">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="flex justify-center mb-6">
              
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              BudgetBuddy AI
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Your personal AI-powered financial companion. Take control of your finances with intelligent insights, automated tracking, and personalized recommendations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8" onClick={onGetStarted}>
                <LogIn className="h-5 w-5 mr-2" />
                Get Started Free
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            <Card className="border-0 bg-card/50 backdrop-blur">
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Smart Analytics</CardTitle>
                <CardDescription>
                  AI-powered insights into your spending patterns and financial health
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Automatic transaction categorization</li>
                  <li>• Spending trend analysis</li>
                  <li>• Personalized recommendations</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/50 backdrop-blur">
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Budget Control</CardTitle>
                <CardDescription>
                  Set intelligent budgets and receive proactive alerts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Dynamic budget tracking</li>
                  <li>• Smart spending alerts</li>
                  <li>• Goal-based budgeting</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/50 backdrop-blur">
              <CardHeader>
                <Zap className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Automated Insights</CardTitle>
                <CardDescription>
                  Let AI handle the heavy lifting of financial analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Bank statement processing</li>
                  <li>• Savings goal optimization</li>
                  <li>• Financial health scoring</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-12">
            <h2 className="text-3xl font-bold mb-4">Ready to transform your finances?</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of users who have taken control of their financial future with BudgetBuddy AI.
            </p>
            <Button size="lg" className="text-lg px-8" onClick={onGetStarted}>
              Start Your Financial Journey
            </Button>
          </div>
        </div>
      </div>
      
      <LegalFooter />
    </div>;
}