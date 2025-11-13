import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [studentComplaints, setStudentComplaints] = useState<any[]>([]);
  const [staffComplaints, setStaffComplaints] = useState<any[]>([]);

  useEffect(() => {
    checkAdmin();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('complaints-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'complaints'
        },
        () => {
          loadComplaints();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    
    if (profileData?.role !== 'admin') {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You do not have admin privileges",
      });
      navigate("/");
      return;
    }
    
    setProfile(profileData);
    await loadComplaints();
    setLoading(false);
  };

  const loadComplaints = async () => {
    try {
      // Get all complaints with user profiles
      const { data: complaints, error } = await supabase
        .from('complaints')
        .select(`
          *,
          profiles!complaints_user_id_fkey(name, role, id_card_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Separate by role
      const students = complaints?.filter((c: any) => c.profiles?.role === 'student') || [];
      const staff = complaints?.filter((c: any) => c.profiles?.role === 'staff') || [];

      setStudentComplaints(students);
      setStaffComplaints(staff);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading complaints",
        description: error.message,
      });
    }
  };

  const handleStatusUpdate = async (complaintId: string, newStatus: "pending" | "seen" | "resolving" | "resolved") => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ status: newStatus })
        .eq('id', complaintId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: "Complaint status has been updated successfully",
      });
      
      await loadComplaints();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message,
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'seen':
        return 'bg-blue-500';
      case 'resolving':
        return 'bg-orange-500';
      case 'resolved':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const ComplaintCard = ({ complaint }: { complaint: any }) => (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{complaint.reason}</CardTitle>
            <CardDescription>
              Ticket: {complaint.ticket} | Submitted by: {complaint.profiles?.name}
            </CardDescription>
            <CardDescription className="text-xs">
              ID: {complaint.profiles?.id_card_number}
            </CardDescription>
          </div>
          <Badge className={getStatusColor(complaint.status)}>{complaint.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{complaint.details}</p>
        
        {complaint.image_urls && complaint.image_urls.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {complaint.image_urls.map((url: string, idx: number) => (
              <img
                key={idx}
                src={url}
                alt={`Complaint image ${idx + 1}`}
                className="w-full h-24 object-cover rounded"
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Update Status:</span>
          <Select
            value={complaint.status}
            onValueChange={(value: "pending" | "seen" | "resolving" | "resolved") => 
              handleStatusUpdate(complaint.id, value)
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="seen">Complaint Seen</SelectItem>
              <SelectItem value="resolving">Resolving Complaint</SelectItem>
              <SelectItem value="resolved">Complaint Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-xs text-muted-foreground">
          Submitted: {new Date(complaint.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Admin Dashboard - Brototype
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {profile?.name} (Admin)
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-1 p-8 bg-gradient-to-b from-primary/5 to-background">
        <div className="container max-w-7xl mx-auto">
          <Tabs defaultValue="students" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
              <TabsTrigger value="students">
                Student Complaints ({studentComplaints.length})
              </TabsTrigger>
              <TabsTrigger value="staff">
                Staff Complaints ({staffComplaints.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="students">
              <div className="space-y-4">
                {studentComplaints.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No student complaints yet
                    </CardContent>
                  </Card>
                ) : (
                  studentComplaints.map((complaint) => (
                    <ComplaintCard key={complaint.id} complaint={complaint} />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="staff">
              <div className="space-y-4">
                {staffComplaints.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No staff complaints yet
                    </CardContent>
                  </Card>
                ) : (
                  staffComplaints.map((complaint) => (
                    <ComplaintCard key={complaint.id} complaint={complaint} />
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <footer className="border-t border-border py-6 bg-muted/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Brototype. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Admin;
