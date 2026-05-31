import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Gavel, Loader2, ArrowLeft } from "lucide-react";
import { authAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import AuthNavbar from "@/components/landing/AuthNavbar";

const VerifyOTP = () => {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const email = location.state?.email || "";

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.verifyOTP({ email, otp });

      if (response.user && response.token) {
        login(response.user, response.token);
      }

      toast({
        title: "Email verified!",
        description: "Your account has been successfully verified.",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid or expired code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast({
        title: "Email not found",
        description: "Please go back and sign up again.",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);

    try {
      await authAPI.resendOTP(email);

      toast({
        title: "Code resent!",
        description: "Check your email for a new verification code.",
      });
    } catch (error: any) {
      toast({
        title: "Resend failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white relative">
      {/* Emerald Glow Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `radial-gradient(125% 125% at 50% 10%, #ffffff 40%, #10b981 100%)`,
          backgroundSize: "100% 100%",
        }}
      />

      {/* Navbar */}
      <div className="relative z-[110]">
        <AuthNavbar />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6 pt-24">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center">
              <Gavel className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-serif font-bold text-black">Auction House</span>
          </div>

        <Card className="bg-white/95 backdrop-blur-sm border-black/10 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-black">Verify your email</CardTitle>
            <CardDescription className="text-black/60">
              We've sent a 6-digit code to <span className="font-medium text-black">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value) => setOtp(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="border-black/20 text-black" />
                  <InputOTPSlot index={1} className="border-black/20 text-black" />
                  <InputOTPSlot index={2} className="border-black/20 text-black" />
                  <InputOTPSlot index={3} className="border-black/20 text-black" />
                  <InputOTPSlot index={4} className="border-black/20 text-black" />
                  <InputOTPSlot index={5} className="border-black/20 text-black" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button 
              onClick={handleVerify} 
              className="w-full bg-black hover:bg-black/90 text-white" 
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-black/60">
              Didn't receive the code?{" "}
              <button
                onClick={handleResend}
                disabled={isResending}
                className="text-black font-medium hover:underline disabled:opacity-50"
              >
                {isResending ? "Resending..." : "Resend"}
              </button>
            </div>
            <Link 
              to="/signup" 
              className="text-sm text-center text-black/60 hover:text-black flex items-center justify-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to signup
            </Link>
          </CardFooter>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
