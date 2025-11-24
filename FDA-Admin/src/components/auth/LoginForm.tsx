import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Eye, EyeOff,  AlertCircle, Mail,Lock} from "lucide-react";
import { signInAdmin } from "../../Firebase/auth"; 

import NourishNowLogo from "../Images/NourishNowLogo.png"

interface LoginFormProps {
  onLogin: (email: string, password: string) => void;
  onSwitchToSignup: () => void;
}

export function LoginForm({ onLogin, onSwitchToSignup }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Use Firebase Auth with admin verification
      const result = await signInAdmin(email, password);
      
      if (result.success) {
        // Success - admin logged in and verified
        onLogin(email, password);
      } else {
        // Handle error from Firebase
        setError(result.error || "Login failed. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Admin login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-green-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header with Logo - Box removed */}
        <div className="text-center" style={{ marginBottom: '-60px' }}>
          <div className="mx-auto" style={{ 
            display: 'inline-block', 
            lineHeight: 0,
            transform: 'scale(1.2)'
          }}>
            <img 
              src={NourishNowLogo}
              alt="NourishNow Logo" 
              style={{ 
                display: 'block',
                maxWidth: '100%',
                height: 'auto'
              }}
            />
          </div>
        </div>

        <Card className="w-full shadow-2xl border-0 bg-white backdrop-blur-sm pt-6 ">
          <CardHeader className="text-center pb-2 pt-4 ">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-green-600 bg-clip-text text-transparent">Welcome Back</CardTitle>
            <CardDescription className="text-base text-gray-600">
              Sign in to your Food Redistribution Admin Dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Error Display */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="email" className="text-gray-700">Email Address</Label>
                  <Mail className="h-4 w-4 text-gray-500" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@foodredist.org"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearError();
                  }}
                  required
                  className="bg-white border-gray-300 focus:border-blue-500"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="password" className="text-gray-700">Password</Label>
                  <Lock className="h-4 w-4 text-gray-500" />
                </div>

                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearError();
                    }}
                    required
                    className="bg-white border-gray-300 focus:border-blue-500 pr-10"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-500 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-semibold py-2.5"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <Button
                variant="link"
                onClick={onSwitchToSignup}
                className="text-blue-600 hover:text-blue-800"
                disabled={loading}
              >
                Don't have an account? Sign up
              </Button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-600">
                This portal is for authorized administrators only.
                Unauthorized access is prohibited.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}