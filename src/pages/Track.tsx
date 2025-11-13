import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Phone, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Chatbot from "@/components/Chatbot";

const Track = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState("");
  const [complaint, setComplaint] = useState<any>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('ticket', ticket.toUpperCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast({
            variant: "destructive",
            title: "Ticket not found",
            description: "Please check your ticket number and try again",
          });
        } else {
          throw error;
        }
        setComplaint(null);
      } else {
        setComplaint(data);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending Review';
      case 'seen':
        return 'Complaint Seen';
      case 'resolving':
        return 'Resolving Complaint';
      case 'resolved':
        return 'Complaint Resolved';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold flex-1 text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Brototype Complaint Registration Site
          </h1>
          <div className="w-20"></div>
        </div>
      </nav>

      <main className="flex-1 p-8 bg-gradient-to-b from-primary/5 to-background">
        <div className="container max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Track Your Complaint</CardTitle>
              <CardDescription>
                Enter your ticket number to check the status of your complaint
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTrack} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ticket">Ticket Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="ticket"
                      placeholder="BT-XXXXXX"
                      value={ticket}
                      onChange={(e) => setTicket(e.target.value.toUpperCase())}
                      required
                    />
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </form>

              {complaint && (
                <div className="mt-8 space-y-4 p-6 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Complaint Details</h3>
                    <Badge className={getStatusColor(complaint.status)}>
                      {getStatusLabel(complaint.status)}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Ticket:</span>
                      <p className="text-lg font-mono">{complaint.ticket}</p>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Reason:</span>
                      <p>{complaint.reason}</p>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Details:</span>
                      <p className="text-sm">{complaint.details}</p>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Submitted:</span>
                      <p className="text-sm">
                        {new Date(complaint.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>

                    {complaint.image_urls && complaint.image_urls.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Images:</span>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {complaint.image_urls.map((url: string, idx: number) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`Complaint image ${idx + 1}`}
                              className="w-full h-32 object-cover rounded"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
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

export default Track;
