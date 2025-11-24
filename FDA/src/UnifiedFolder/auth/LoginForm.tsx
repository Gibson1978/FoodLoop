import { useState, useEffect } from "react";
import { Button } from "../../UnifiedFolder/ui/button";
import { Input } from "../../UnifiedFolder/ui/input";
import { Label } from "../../UnifiedFolder/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../UnifiedFolder/ui/card";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import { signInUser } from "../../Firebase/auth";
import type { UserData } from "../../Firebase/auth";
import NourishNowLogo from "../Images/NourishNowLogo.png";

interface LoginFormProps {
  onLogin: (userData: UserData) => void;
  onSwitchToSignup: () => void;
}

export function LoginForm({ onLogin, onSwitchToSignup }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signInUser(email, password);
      if (result.success && result.userData) {
        onLogin(result.userData);
      } else {
        setError(result.error || "Login failed. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-500 via-blue-600 to-green-600 flex items-center justify-center p-4 safe-area-padding">
      <div className="w-full max-w-[90vw] sm:max-w-[400px] flex flex-col min-h-0"> {/* Flexible max-width */}
        
        {/* Logo that scales */}
        <div className="text-center flex-shrink-0 flex items-center justify-center -mb-6 sm:-mb-8 md:-mb-10">
          <div className="mx-auto inline-block">
            <img 
              src={NourishNowLogo}
              alt="NourishNow Logo" 
              className="w-auto h-24 sm:h-32 md:h-40"
            />
          </div>
        </div>

        {/* Card that grows/shrinks */}
        <Card className="mt-[-4rem] sm:mt-[-3rem] md:mt-[-4rem]">
          <CardHeader className="text-center pb-2 pt-4 flex-shrink-0">
            <CardTitle className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-500 to-green-600 bg-clip-text text-transparent">
              Welcome to NourishNow
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-gray-600">
              Sign in to continue your journey
            </CardDescription>
          </CardHeader>
          
          <CardContent className="flex-1 min-h-0 flex flex-col pb-4 px-4">
            {/* Error Display */}
            {error && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 flex-shrink-0">
                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 flex-shrink-0" />
                <p className="text-red-700 text-xs sm:text-sm flex-1">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 flex-1 min-h-0 flex flex-col">
              {/* Form fields container */}
              <div className="space-y-3 sm:space-y-4 flex-1">
                {/* Email */}
                <div className="space-y-1 sm:space-y-2">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Label htmlFor="email" className="text-xs sm:text-sm font-medium text-gray-700">Email Address</Label>
                    <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1 sm:space-y-2">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Label htmlFor="password" className="text-xs sm:text-sm font-medium text-gray-700">Password</Label>
                    <Lock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4 pr-10 sm:pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 sm:right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 sm:h-8 sm:w-8 p-0 hover:bg-gray-100 text-gray-500 rounded"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" />
                      ) : (
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Submit button at bottom */}
              <div className="flex-shrink-0 space-y-3 sm:space-y-4">
                <Button 
                  type="submit" 
                  className="w-full h-10 sm:h-12 bg-gradient-to-r from-blue-500 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Signing in...
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </Button>

                {/* Switch to Signup */}
                <div className="text-center pt-2 sm:pt-3 border-t border-gray-200">
                  <p className="text-gray-600 text-xs sm:text-sm">
                    Don't have an account?{" "}
                    <Button
                      variant="link"
                      onClick={onSwitchToSignup}
                      className="text-blue-600 hover:text-blue-700 p-0 h-auto text-xs sm:text-sm font-semibold hover:underline"
                      disabled={loading}
                    >
                      Create one now
                    </Button>
                  </p>
                </div>

                {/* Pending Approval Info */}
                <div className="p-2 sm:p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-yellow-700 text-xs sm:text-sm leading-tight">
                      <strong>Note:</strong> Account requires admin approval before sign in.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-3 sm:mt-4 flex-shrink-0">
          <p className="text-blue-100 text-xs sm:text-sm">
            By continuing, you agree to our{" "}
            <a href="#" className="underline hover:text-white font-medium">Terms</a>{" "}
            and{" "}
            <a href="#" className="underline hover:text-white font-medium">Privacy</a>
          </p>
        </div>
      </div>
    </div>
  );
}