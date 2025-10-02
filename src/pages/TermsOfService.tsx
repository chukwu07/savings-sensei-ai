import React from 'react';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';


export default function TermsOfService() {

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/5">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => window.location.href = '/'}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to App
          </Button>
        </div>

        <EnhancedCard className="max-w-4xl mx-auto">
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-8 text-center">Terms of Service</h1>
            
            <div className="space-y-6 text-muted-foreground">
              <div>
                <p className="text-sm mb-4">Last updated: {new Date().toLocaleDateString()}</p>
              </div>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
                <p>By accessing and using BudgetBuddy AI ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">2. Description of Service</h2>
                <p>BudgetBuddy AI is a personal finance management application that helps users:</p>
                <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                  <li>Track income and expenses</li>
                  <li>Set and monitor budgets</li>
                  <li>Manage savings goals</li>
                  <li>Receive AI-powered financial insights</li>
                  <li>Import bank statements and transaction data</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">3. User Accounts</h2>
                <div className="space-y-2">
                  <p>To access certain features of the Service, you must create an account. You agree to:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Provide accurate and complete information</li>
                    <li>Maintain the security of your account credentials</li>
                    <li>Accept responsibility for all activities under your account</li>
                    <li>Notify us immediately of any unauthorized use</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">4. Financial Data and Privacy</h2>
                <div className="space-y-2">
                  <p>You acknowledge that:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>You are responsible for the accuracy of financial data you input</li>
                    <li>We implement security measures to protect your data</li>
                    <li>You understand the inherent risks of storing financial information online</li>
                    <li>We are not liable for investment decisions based on our insights</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">5. Premium Subscription</h2>
                <div className="space-y-2">
                  <p>Premium features are available through a paid subscription:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Subscription fees are billed monthly at £6.99/month</li>
                    <li>You may cancel your subscription at any time</li>
                    <li>Refunds are provided according to our refund policy</li>
                    <li>Premium features are disabled upon cancellation</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">6. Acceptable Use</h2>
                <div className="space-y-2">
                  <p>You agree not to:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Use the Service for any illegal or unauthorized purpose</li>
                    <li>Violate any laws in your jurisdiction</li>
                    <li>Transmit viruses, malware, or malicious code</li>
                    <li>Attempt to gain unauthorized access to our systems</li>
                    <li>Interfere with or disrupt the Service</li>
                    <li>Use the Service to transmit spam or unsolicited messages</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">7. AI-Powered Features</h2>
                <div className="space-y-2">
                  <p>Our AI-powered features:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Provide insights based on your financial data</li>
                    <li>Are for informational purposes only</li>
                    <li>Should not be considered professional financial advice</li>
                    <li>May not be 100% accurate and should be verified independently</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">8. Intellectual Property</h2>
                <p>The Service and its original content, features, and functionality are owned by BudgetBuddy AI and are protected by copyright, trademark, and other intellectual property laws.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">9. Disclaimers</h2>
                <div className="space-y-2">
                  <p>The Service is provided "as is" without warranties of any kind:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>We do not guarantee uninterrupted or error-free service</li>
                    <li>We are not responsible for investment losses</li>
                    <li>We do not provide professional financial advice</li>
                    <li>Users should consult financial professionals for major decisions</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">10. Limitation of Liability</h2>
                <p>In no event shall BudgetBuddy AI be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with your use of the Service.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">11. Termination</h2>
                <p>We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including breach of these Terms.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">12. Changes to Terms</h2>
                <p>We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Your continued use of the Service constitutes acceptance of the modified terms.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">13. Contact Information</h2>
                <p>For questions about these Terms of Service, please contact us at:</p>
                <div className="mt-2 p-4 bg-muted rounded-lg">
                  <p>Email: support@budgetbuddy.app</p>
                  <p>Address: [Your Business Address]</p>
                </div>
              </section>
            </div>
          </div>
        </EnhancedCard>
      </div>
    </div>
  );
}