import React, { useState } from 'react';

import { Separator } from '@/components/ui/separator';
import { ContactSupportDialog } from '@/components/support/ContactSupportDialog';

export function LegalFooter() {
  const [supportOpen, setSupportOpen] = useState(false);

  return (
    <footer className="mt-auto border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="flex flex-wrap justify-center gap-6">
            <button 
              onClick={() => window.open('/privacy', '_blank')}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Privacy Policy
            </button>
            <button 
              onClick={() => window.open('/terms', '_blank')}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Terms of Service
            </button>
            <button
              onClick={() => setSupportOpen(true)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Contact Support
            </button>
          </div>
          <ContactSupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
          
          <Separator className="w-32" />
          
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} BudgetBuddy AI. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Your personal AI-powered financial companion
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}