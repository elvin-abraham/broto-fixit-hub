import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogOut, Upload, Phone } from "lucide-react";
import Chatbot from "@/components/Chatbot";

const Complaints = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    reason: "",
    details: "",
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    
    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    
    setProfile(profileData);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const uploadFiles = async (files: File[], folder: string) => {
    const urls: string[] = [];
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('complaint-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('complaint-files')
        .getPublicUrl(filePath);

      urls.push(publicUrl);
    }
    
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setUploading(true);

    try {
      // Upload files
      const imageUrls = imageFiles.length > 0 ? await uploadFiles(imageFiles, 'images') : [];
      const videoUrls = videoFiles.length > 0 ? await uploadFiles(videoFiles, 'videos') : [];
      
      setUploading(false);

      // Generate ticket
      const { data: ticketData, error: ticketError } = await supabase
        .rpc('generate_ticket');

      if (ticketError) throw ticketError;

      // Insert complaint
      const { error: insertError } = await supabase
        .from('complaints')
        .insert({
          user_id: user.id,
          ticket: ticketData,
          reason: formData.reason,
          details: formData.details,
          image_urls: imageUrls,
          video_urls: videoUrls,
        });

      if (insertError) throw insertError;

      toast({
        title: "Complaint submitted successfully!",
        description: `Your ticket number is: ${ticketData}. Save this to track your complaint.`,
      });

      // Reset form
      setFormData({ reason: "", details: "" });
      setImageFiles([]);
      setVideoFiles([]);
      
      // Show ticket in alert
      alert(`Complaint submitted!\n\nYour Ticket Number: ${ticketData}\n\nPlease save this ticket number to track your complaint status.`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Brototype Complaint Registration Site
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {profile?.name} ({profile?.role})
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-1 p-8 bg-gradient-to-b from-primary/5 to-background">
        <div className="container max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Submit a Complaint</CardTitle>
              <CardDescription>
                Fill out the form below to register your complaint
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Complaint *</Label>
                  <Input
                    id="reason"
                    placeholder="Brief description of your issue"
                    value={formData.reason}
                    onChange={(e) =>
                      setFormData({ ...formData, reason: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="details">Please Provide Further Details *</Label>
                  <Textarea
                    id="details"
                    placeholder="Explain your complaint in detail..."
                    value={formData.details}
                    onChange={(e) =>
                      setFormData({ ...formData, details: e.target.value })
                    }
                    required
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="images">Images (Optional)</Label>
                  <Input
                    id="images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
                  />
                  {imageFiles.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {imageFiles.length} file(s) selected
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="videos">Videos (Optional)</Label>
                  <Input
                    id="videos"
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={(e) => setVideoFiles(Array.from(e.target.files || []))}
                  />
                  {videoFiles.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {videoFiles.length} file(s) selected
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {uploading ? (
                    <>
                      <Upload className="mr-2 h-4 w-4 animate-bounce" />
                      Uploading files...
                    </>
                  ) : loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Complaint"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Phone Contact */}
          <div className="mt-6 text-center">
            <a href="tel:+1234567890">
              <Button variant="outline" size="lg">
                <Phone className="h-5 w-5 mr-2" />
                Call Complaint Section
              </Button>
            </a>
          </div>
        </div>
      </main>

      {/* Chatbot */}
      <Chatbot />

      <footer className="border-t border-border py-6 bg-muted/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Brototype. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Complaints;
