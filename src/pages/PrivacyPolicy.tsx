import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';


export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/5">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to App
          </Button>
        </div>

        <EnhancedCard className="max-w-4xl mx-auto">
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-8 text-center">Privacy Policy</h1>
            
            <div className="space-y-6 text-muted-foreground">
              <div>
                <p className="text-sm mb-4">Last updated: 28 November 2025</p>
              </div>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">1. Information We Collect</h2>
                <div className="space-y-2">
                  <p>We collect information you provide directly to us, such as:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Account information (email address, display name)</li>
                    <li>Financial data (transactions, budgets, savings goals)</li>
                    <li>Profile information (avatar, preferences)</li>
                    <li>Communication data when you contact us</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
                <div className="space-y-2">
                  <p>We use the information we collect to:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Provide, maintain, and improve our financial management services</li>
                    <li>Process transactions and send related information</li>
                    <li>Send technical notices, updates, and security alerts</li>
                    <li>Provide AI-powered financial insights and recommendations</li>
                    <li>Respond to your comments, questions, and customer service requests</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">3. Information Sharing and Disclosure</h2>
                <div className="space-y-2">
                  <p>We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described below:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>With service providers who assist us in operating our app</li>
                    <li>To comply with legal obligations or protect our rights</li>
                    <li>In connection with a business transfer or merger</li>
                    <li>With your explicit consent for specific purposes</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">4. Data Security</h2>
                <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes:</p>
                <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                  <li>Encryption of sensitive data in transit and at rest</li>
                  <li>Row-level security policies in our database</li>
                  <li>Regular security audits and monitoring</li>
                  <li>Secure authentication and authorization systems</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">5. Data Retention</h2>
                <p>We retain your information for as long as your account is active or as needed to provide you services. You may request deletion of your account and personal data at any time by contacting us.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">6. Your Rights</h2>
                <p>You have the right to:</p>
                <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                  <li>Access, update, or delete your personal information</li>
                  <li>Export your data in a portable format</li>
                  <li>Opt-out of marketing communications</li>
                  <li>Request restrictions on processing of your data</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">7. Third-Party Services</h2>
                <p>Our app integrates with third-party services including:</p>
                <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                  <li>Stripe for payment processing</li>
                  <li>OpenAI for AI-powered financial insights</li>
                  <li>Supabase for data storage and authentication</li>
                </ul>
                <p className="mt-2">These services have their own privacy policies that govern their use of your information.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">8. Children's Privacy</h2>
                <p>Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">9. Changes to This Privacy Policy</h2>
                <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page and updating the "Last updated" date.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">10. Contact Us</h2>
                <p>If you have any questions about this privacy policy, please contact us at:</p>
                <div className="mt-2 p-4 bg-muted rounded-lg">
                  <p>Email: support@budgetbuddyai.co.uk</p>
                </div>
              </section>
            </div>
          </div>
        </EnhancedCard>
      </div>
    </div>
  );
}