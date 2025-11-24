import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Eye, EyeOff, Upload, X, AlertCircle, Mail, Lock, User, Phone } from "lucide-react";
import { signUpAdmin, type AdminSignupData } from "../../Firebase/auth";

import NourishNowLogo from "../Images/NourishNowLogo.png"

interface SignupFormProps {
  onSignup: (data: any) => void;
  onSwitchToLogin: () => void;
}

export function SignupForm({ onSignup, onSwitchToLogin }: SignupFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate form
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (!idFile) {
      setError("ID verification document is required");
      setLoading(false);
      return;
    }

    try {
      // Prepare admin data
      const adminData: AdminSignupData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone
      };

      // Use Firebase Auth and Firestore
      const result = await signUpAdmin(adminData);
      
      if (result.success) {
        // Success - admin created and data stored in Firestore
        onSignup({ ...formData, idFile });
      } else {
        // Handle error from Firebase
        setError(result.error || "Admin account creation failed. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Admin signup error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (!validTypes.includes(file.type)) {
        setError('Please upload a valid file type (JPEG, PNG, PDF)');
        return;
      }
      
      if (file.size > maxSize) {
        setError('File size must be less than 10MB');
        return;
      }
      
      setIdFile(file);
      setError(null);
    }
  };

  const removeFile = () => {
    setIdFile(null);
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-green-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header with Logo */}
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

        <Card className="w-full shadow-2xl border-0 bg-white backdrop-blur-sm pt-6">
          <CardHeader className="text-center pb-2 pt-4">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-green-600 bg-clip-text text-transparent">
              Join Our Mission
            </CardTitle>
            <CardDescription className="text-base text-gray-600">
              Create your admin account to start redistributing food
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
                  <Label htmlFor="name" className="text-gray-700">Full Name</Label>
                  <User className="h-4 w-4 text-gray-500" />
                </div>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, name: e.target.value }));
                    clearError();
                  }}
                  required
                  className="bg-white border-gray-300 focus:border-blue-500"
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="email" className="text-gray-700">Email Address</Label>
                  <Mail className="h-4 w-4 text-gray-500" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@foodredist.org"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, email: e.target.value }));
                    clearError();
                  }}
                  required
                  className="bg-white border-gray-300 focus:border-blue-500"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="phone" className="text-gray-700">Phone Number</Label>
                  <Phone className="h-4 w-4 text-gray-500" />
                </div>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, phone: e.target.value }));
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
                    placeholder="Create a strong password (min. 6 characters)"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, password: e.target.value }));
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

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="confirmPassword" className="text-gray-700">Confirm Password</Label>
                  <Lock className="h-4 w-4 text-gray-500" />
                </div>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, confirmPassword: e.target.value }));
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
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="id-upload" className="text-gray-700">ID Verification</Label>
                <div className="relative">
                  <input
                    id="id-upload"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    required
                    disabled={loading}
                  />
                  <Label
                    htmlFor="id-upload"
                    className={`flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer transition-colors ${
                      loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-center">
                      <Upload className="mx-auto h-6 w-6 text-gray-500 mb-2" />
                      <p className="text-sm text-gray-700">Upload government ID or passport</p>
                      <p className="text-xs text-gray-500">PDF, PNG, JPG up to 10MB</p>
                    </div>
                  </Label>
                  {idFile && (
                    <div className="mt-2 flex items-center justify-between p-2 bg-blue-50 rounded border">
                      <span className="text-sm text-gray-700 truncate flex-1">{idFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeFile}
                        disabled={loading}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
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
                    Creating Admin Account...
                  </div>
                ) : (
                  "Create Admin Account"
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <Button
                variant="link"
                onClick={onSwitchToLogin}
                className="text-blue-600 hover:text-blue-800"
                disabled={loading}
              >
                Already have an account? Sign in
              </Button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-600">
                By creating an admin account, you agree to our terms of service and privacy policy.
                Admin accounts require verification and approval.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}