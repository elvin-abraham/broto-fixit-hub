import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Search, UserCircle } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Brototype Complaint Registration Site
          </h1>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-primary/5 to-background">
        <div className="container max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-foreground">Welcome to Brototype</h2>
            <p className="text-xl text-muted-foreground">
              Your voice matters. Submit and track your complaints with ease.
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Student/Staff Login Card */}
            <Card className="hover:shadow-lg transition-shadow duration-300 border-2 hover:border-primary/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <UserCircle className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Student/Staff Portal</CardTitle>
                </div>
                <CardDescription className="text-base">
                  Login to submit and manage your complaints
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/auth">
                  <Button className="w-full" size="lg">
                    <UserCircle className="mr-2 h-5 w-5" />
                    Login / Signup
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Track Complaint Card */}
            <Card className="hover:shadow-lg transition-shadow duration-300 border-2 hover:border-secondary/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 rounded-lg bg-secondary/10">
                    <Search className="h-8 w-8 text-secondary" />
                  </div>
                  <CardTitle className="text-2xl">Track Complaint</CardTitle>
                </div>
                <CardDescription className="text-base">
                  Check your complaint status using your ticket number
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/track">
                  <Button variant="secondary" className="w-full" size="lg">
                    <Search className="mr-2 h-5 w-5" />
                    Track Status
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Admin Access */}
          <div className="text-center mt-8">
            <Link to="/admin">
              <Button variant="outline" size="sm">
                Admin Access
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 bg-muted/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Brototype. All rights reserved.</p>
          <p className="mt-2">For urgent matters, please contact us directly.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
