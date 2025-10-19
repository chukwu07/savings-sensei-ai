import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EnhancedCard } from "@/components/ui/enhanced-card";
import { User, Edit2, Save, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { profileSchema, formatZodError } from "@/lib/validation-schemas";

export function ProfileSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<{
    display_name?: string;
    first_name?: string;
    last_name?: string;
  } | null>(null);
  
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: ""
  });

  // Fetch profile data
  useEffect(() => {
    if (user?.id) {
      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', user.id)
            .single();
          
          if (data && !error) {
            setProfile(data);
            // Parse display name into first and last name for editing
            const names = data.display_name?.split(' ') || ['', ''];
            setEditForm({
              firstName: names[0] || '',
              lastName: names.slice(1).join(' ') || ''
            });
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      };
      fetchProfile();
    }
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;

    // Validate input with Zod
    const result = profileSchema.safeParse({
      firstName: editForm.firstName,
      lastName: editForm.lastName
    });

    if (!result.success) {
      toast({
        title: "Validation Error",
        description: formatZodError(result.error),
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const displayName = `${result.data.firstName} ${result.data.lastName}`;
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          display_name: displayName
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setProfile({ display_name: displayName });
      setIsEditing(false);
      
      toast({
        title: "Profile Updated",
        description: "Your name has been updated successfully!",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    const names = profile?.display_name?.split(' ') || ['', ''];
    setEditForm({
      firstName: names[0] || '',
      lastName: names.slice(1).join(' ') || ''
    });
    setIsEditing(false);
  };

  return (
    <EnhancedCard variant="settings" className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Profile Information</h3>
              <p className="text-sm text-muted-foreground">
                Manage your display name
              </p>
            </div>
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="editFirstName" className="text-sm font-medium">
                  First Name
                </Label>
                <Input
                  id="editFirstName"
                  type="text"
                  placeholder="First name"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="editLastName" className="text-sm font-medium">
                  Last Name
                </Label>
                <Input
                  id="editLastName"
                  type="text"
                  placeholder="Last name"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={isLoading}
                size="sm"
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                size="sm"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <Label className="text-sm font-medium">Display Name</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {profile?.display_name || "Not set"}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {user?.email || "Not available"}
              </p>
            </div>
          </div>
        )}
      </div>
    </EnhancedCard>
  );
}