import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Gavel, Mail, Lock, User, Loader2, Calendar, AlertCircle, Eye, EyeOff, MapPin, Phone, Home, Camera, Upload } from "lucide-react";
import { authAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import AuthNavbar from "@/components/landing/AuthNavbar";

const Signup = () => {
  // Personal Details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string>("");
  
  // Contact Details
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [state, setState] = useState("");
  
  // Password Section
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  // Indian states list
  const indianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
    "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh", "Chandigarh", 
    "Dadra and Nagar Haveli and Daman and Diu", "Lakshadweep", "Puducherry"
  ];

  // Validation functions
  const validateName = (name: string, fieldName: string): string => {
    if (!name.trim()) return `${fieldName} is required`;
    if (name.trim().length < 2) return `${fieldName} must be at least 2 characters`;
    if (name.trim().length > 50) return `${fieldName} must be less than 50 characters`;
    if (!/^[a-zA-Z\s'-]+$/.test(name.trim())) return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
    return "";
  };

  const validateEmail = (email: string): string => {
    if (!email.trim()) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    if (email.length > 254) return "Email address is too long";
    return "";
  };

  const validateMobile = (mobile: string): string => {
    if (!mobile.trim()) return "Mobile number is required";
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile.replace(/\s+/g, ''))) return "Please enter a valid 10-digit mobile number";
    return "";
  };

  const validatePincode = (pincode: string): string => {
    if (!pincode.trim()) return "Pincode is required";
    const pincodeRegex = /^[1-9][0-9]{5}$/;
    if (!pincodeRegex.test(pincode)) return "Please enter a valid 6-digit pincode";
    return "";
  };

  const validateDateOfBirth = (dob: string): string => {
    if (!dob) return "Date of birth is required";
    const birthDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (birthDate > today) return "Date of birth cannot be in the future";
    if (age < 13) return "You must be at least 13 years old to register";
    if (age > 120) return "Please enter a valid date of birth";
    return "";
  };

  const validatePassword = (password: string): string => {
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters long";
    if (!/(?=.*[a-z])/.test(password)) return "Password must contain at least one lowercase letter";
    if (!/(?=.*[A-Z])/.test(password)) return "Password must contain at least one uppercase letter";
    if (!/(?=.*\d)/.test(password)) return "Password must contain at least one number";
    if (!/(?=.*[@$!%*?&])/.test(password)) return "Password must contain at least one special character (@$!%*?&)";
    return "";
  };

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, profilePhoto: "Please select a valid image file" }));
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, profilePhoto: "Image size must be less than 5MB" }));
        return;
      }
      
      setProfilePhoto(file);
      setErrors(prev => ({ ...prev, profilePhoto: "" }));
      
      // Create preview and compress image
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for compression
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate new dimensions (max 400x400)
          const maxSize = 400;
          let { width, height } = img;
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setProfilePhotoPreview(compressedDataUrl);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfilePhoto = () => {
    setProfilePhoto(null);
    setProfilePhotoPreview("");
    setErrors(prev => ({ ...prev, profilePhoto: "" }));
  };

  const validateField = (field: string, value: string) => {
    let error = "";
    
    switch (field) {
      case "firstName": error = validateName(value, "First name"); break;
      case "lastName": error = validateName(value, "Last name"); break;
      case "email": error = validateEmail(value); break;
      case "mobileNumber": error = validateMobile(value); break;
      case "address": error = !value.trim() ? "Address is required" : ""; break;
      case "pincode": error = validatePincode(value); break;
      case "state": error = !value ? "State is required" : ""; break;
      case "gender": error = !value ? "Gender is required" : ""; break;
      case "dateOfBirth": error = validateDateOfBirth(value); break;
      case "password": 
        error = validatePassword(value);
        if (confirmPassword) {
          const confirmError = value !== confirmPassword ? "Passwords do not match" : "";
          setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
        }
        break;
      case "confirmPassword": error = value !== password ? "Passwords do not match" : ""; break;
    }
    
    setErrors(prev => ({ ...prev, [field]: error }));
    return error === "";
  };

  const validateAllFields = (): boolean => {
    const fields = {
      firstName, lastName, email, mobileNumber, address, pincode, state, 
      gender, dateOfBirth, password, confirmPassword
    };
    
    let isValid = true;
    Object.entries(fields).forEach(([field, value]) => {
      if (!validateField(field, value)) isValid = false;
    });
    
    return isValid;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAllFields()) {
      toast({
        title: "Please fix the errors",
        description: "There are validation errors in the form. Please correct them and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      
      // Use the compressed profile photo preview if available
      const profilePhotoBase64 = profilePhotoPreview || "";
      
      const response = await authAPI.signup({ 
        email: email.trim(), 
        password, 
        fullName,
        dateOfBirth,
        mobileNumber: mobileNumber.trim(),
        address: address.trim(),
        pincode: pincode.trim(),
        state,
        gender,
        profilePhoto: profilePhotoBase64
      });

      // Always expect OTP verification now
      if (response.requiresVerification) {
        // Show appropriate message based on email service status
        if (response.developmentNote) {
          toast({
            title: "Check server console!",
            description: "Email service unavailable. Check the server console for your OTP code.",
          });
        } else {
          toast({
            title: "Check your email!",
            description: "We've sent you a verification code to complete your registration.",
          });
        }

        navigate("/verify-otp", { state: { email: email.trim() } });
      } else {
        // This shouldn't happen anymore, but handle gracefully
        toast({
          title: "Verification required",
          description: "Please check your email for verification instructions.",
        });

        navigate("/verify-otp", { state: { email: email.trim() } });
      }
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getMaxDate = () => {
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
    return maxDate.toISOString().split('T')[0];
  };

  return (
    <div className="min-h-screen w-full bg-white relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `radial-gradient(125% 125% at 50% 10%, #ffffff 40%, #10b981 100%)`,
        }}
      />

      {/* Navbar */}
      <div className="relative z-[110]">
        <AuthNavbar />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-start justify-center p-4 pt-28 pb-8">
        <div className="w-full max-w-6xl">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center">
              <Gavel className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-serif font-bold text-black">Auction House</span>
          </div>

          <Card className="bg-white/95 backdrop-blur-sm border-black/10 shadow-xl max-h-[calc(100vh-120px)] overflow-hidden">
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-xl font-bold text-black">Create Your Account</CardTitle>
              <CardDescription className="text-black/60 text-sm">
                Fill in your details to get started with Auction House
              </CardDescription>
            </CardHeader>
            
            <CardContent className="overflow-y-auto px-6 pb-6" style={{ maxHeight: 'calc(100vh - 220px)' }}>
              <form onSubmit={handleSignup} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Personal Details */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-lg font-semibold text-black">Personal Details</h3>
                    </div>

                    {/* Profile Photo Upload */}
                    <div className="space-y-2">
                      <Label className="text-black text-sm">Profile Photo</Label>
                      <div className="flex flex-col items-center space-y-2">
                        <div className="relative">
                          <Avatar className="w-16 h-16 border-2 border-black/20">
                            <AvatarImage src={profilePhotoPreview} />
                            <AvatarFallback className="bg-emerald-100 text-emerald-600 text-sm">
                              {firstName && lastName ? `${firstName[0]}${lastName[0]}`.toUpperCase() : <Camera className="w-6 h-6" />}
                            </AvatarFallback>
                          </Avatar>
                          {profilePhotoPreview && (
                            <button
                              type="button"
                              onClick={removeProfilePhoto}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                            >
                              ×
                            </button>
                          )}
                        </div>
                        <label htmlFor="profilePhoto" className="cursor-pointer">
                          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-200 hover:bg-emerald-100 transition-colors text-xs">
                            <Upload className="w-3 h-3" />
                            Choose Photo
                          </div>
                          <input
                            id="profilePhoto"
                            type="file"
                            accept="image/*"
                            onChange={handleProfilePhotoChange}
                            className="hidden"
                          />
                        </label>
                        {errors.profilePhoto && (
                          <div className="flex items-center gap-1 text-red-600 text-xs">
                            <AlertCircle className="h-3 w-3" />
                            <span>{errors.profilePhoto}</span>
                          </div>
                        )}
                        <p className="text-xs text-black/60 text-center">
                          Optional. Max 5MB. Images will be compressed.
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-black text-sm">First Name *</Label>
                        <Input
                          id="firstName"
                          type="text"
                          placeholder="John"
                          value={firstName}
                          onChange={(e) => {
                            setFirstName(e.target.value);
                            validateField("firstName", e.target.value);
                          }}
                          className={`bg-white border-black/20 text-black placeholder:text-black/40 h-9 ${
                            errors.firstName ? 'border-red-500' : ''
                          }`}
                          required
                        />
                        {errors.firstName && (
                          <div className="flex items-center gap-1 text-red-600 text-xs">
                            <AlertCircle className="h-3 w-3" />
                            <span>{errors.firstName}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-black text-sm">Last Name *</Label>
                        <Input
                          id="lastName"
                          type="text"
                          placeholder="Doe"
                          value={lastName}
                          onChange={(e) => {
                            setLastName(e.target.value);
                            validateField("lastName", e.target.value);
                          }}
                          className={`bg-white border-black/20 text-black placeholder:text-black/40 h-9 ${
                            errors.lastName ? 'border-red-500' : ''
                          }`}
                          required
                        />
                        {errors.lastName && (
                          <div className="flex items-center gap-1 text-red-600 text-xs">
                            <AlertCircle className="h-3 w-3" />
                            <span>{errors.lastName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth" className="text-black text-sm">Date of Birth *</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-black/50" />
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={dateOfBirth}
                          onChange={(e) => {
                            setDateOfBirth(e.target.value);
                            validateField("dateOfBirth", e.target.value);
                          }}
                          max={getMaxDate()}
                          className={`pl-10 bg-white border-black/20 text-black h-9 ${
                            errors.dateOfBirth ? 'border-red-500' : ''
                          }`}
                          required
                        />
                      </div>
                      {errors.dateOfBirth && (
                        <div className="flex items-center gap-1 text-red-600 text-xs">
                          <AlertCircle className="h-3 w-3" />
                          <span>{errors.dateOfBirth}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender" className="text-black text-sm">Gender *</Label>
                      <Select value={gender} onValueChange={(value) => {
                        setGender(value);
                        validateField("gender", value);
                      }}>
                        <SelectTrigger className={`bg-white border-black/20 text-black h-9 ${
                          errors.gender ? 'border-red-500' : ''
                        }`}>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.gender && (
                        <div className="flex items-center gap-1 text-red-600 text-xs">
                          <AlertCircle className="h-3 w-3" />
                          <span>{errors.gender}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Phone className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-lg font-semibold text-black">Contact Details</h3>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-black text-sm">Email Address *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-black/50" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            validateField("email", e.target.value);
                          }}
                          className={`pl-10 bg-white border-black/20 text-black placeholder:text-black/40 h-9 ${
                            errors.email ? 'border-red-500' : ''
                          }`}
                          required
                        />
                      </div>
                      {errors.email && (
                        <div className="flex items-center gap-1 text-red-600 text-xs">
                          <AlertCircle className="h-3 w-3" />
                          <span>{errors.email}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mobileNumber" className="text-black text-sm">Mobile Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-black/50" />
                        <Input
                          id="mobileNumber"
                          type="tel"
                          placeholder="9876543210"
                          value={mobileNumber}
                          onChange={(e) => {
                            setMobileNumber(e.target.value);
                            validateField("mobileNumber", e.target.value);
                          }}
                          className={`pl-10 bg-white border-black/20 text-black placeholder:text-black/40 h-9 ${
                            errors.mobileNumber ? 'border-red-500' : ''
                          }`}
                          required
                        />
                      </div>
                      {errors.mobileNumber && (
                        <div className="flex items-center gap-1 text-red-600 text-xs">
                          <AlertCircle className="h-3 w-3" />
                          <span>{errors.mobileNumber}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-black text-sm">Address *</Label>
                      <div className="relative">
                        <Home className="absolute left-3 top-2.5 h-4 w-4 text-black/50" />
                        <Input
                          id="address"
                          type="text"
                          placeholder="123 Main Street, City"
                          value={address}
                          onChange={(e) => {
                            setAddress(e.target.value);
                            validateField("address", e.target.value);
                          }}
                          className={`pl-10 bg-white border-black/20 text-black placeholder:text-black/40 h-9 ${
                            errors.address ? 'border-red-500' : ''
                          }`}
                          required
                        />
                      </div>
                      {errors.address && (
                        <div className="flex items-center gap-1 text-red-600 text-xs">
                          <AlertCircle className="h-3 w-3" />
                          <span>{errors.address}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="pincode" className="text-black text-sm">Pincode *</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-black/50" />
                          <Input
                            id="pincode"
                            type="text"
                            placeholder="400001"
                            value={pincode}
                            onChange={(e) => {
                              setPincode(e.target.value);
                              validateField("pincode", e.target.value);
                            }}
                            className={`pl-10 bg-white border-black/20 text-black placeholder:text-black/40 h-9 ${
                              errors.pincode ? 'border-red-500' : ''
                            }`}
                            required
                          />
                        </div>
                        {errors.pincode && (
                          <div className="flex items-center gap-1 text-red-600 text-xs">
                            <AlertCircle className="h-3 w-3" />
                            <span>{errors.pincode}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="state" className="text-black text-sm">State *</Label>
                        <Select value={state} onValueChange={(value) => {
                          setState(value);
                          validateField("state", value);
                        }}>
                          <SelectTrigger className={`bg-white border-black/20 text-black h-9 ${
                            errors.state ? 'border-red-500' : ''
                          }`}>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent className="max-h-48">
                            {indianStates.map((stateName) => (
                              <SelectItem key={stateName} value={stateName}>
                                {stateName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.state && (
                          <div className="flex items-center gap-1 text-red-600 text-xs">
                            <AlertCircle className="h-3 w-3" />
                            <span>{errors.state}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Password Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Lock className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-lg font-semibold text-black">Password</h3>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-black text-sm">Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-black/50" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            validateField("password", e.target.value);
                          }}
                          className={`pl-10 pr-10 bg-white border-black/20 text-black placeholder:text-black/40 h-9 ${
                            errors.password ? 'border-red-500' : ''
                          }`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-black/50 hover:text-black/70"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password && (
                        <div className="flex items-center gap-1 text-red-600 text-xs">
                          <AlertCircle className="h-3 w-3" />
                          <span>{errors.password}</span>
                        </div>
                      )}
                      <div className="text-xs text-black/60">
                        <p className="mb-1">Must contain: 8+ chars, upper/lower case, number, special char</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-black text-sm">Confirm Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-black/50" />
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            validateField("confirmPassword", e.target.value);
                          }}
                          className={`pl-10 pr-10 bg-white border-black/20 text-black placeholder:text-black/40 h-9 ${
                            errors.confirmPassword ? 'border-red-500' : ''
                          }`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-2.5 text-black/50 hover:text-black/70"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <div className="flex items-center gap-1 text-red-600 text-xs">
                          <AlertCircle className="h-3 w-3" />
                          <span>{errors.confirmPassword}</span>
                        </div>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-black hover:bg-black/90 text-white h-10 mt-4" 
                      disabled={isLoading || Object.values(errors).some(error => error !== "")}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>

                    <div className="text-sm text-center text-black/60 mt-3">
                      Already have an account?{" "}
                      <Link to="/login" className="text-black font-medium hover:underline">
                        Sign in
                      </Link>
                    </div>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Signup;
