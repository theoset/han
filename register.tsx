import { Layout } from "@/components/layout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegisterWorker } from "@workspace/api-client-react";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { saveAuth } from "@/lib/auth";
import { useState } from "react";
import { CheckCircle2, Upload, Shield } from "lucide-react";

const SERVICE_OPTIONS = [
  "House Cleaning", "Gardening", "Moving Assistance",
  "Handyman", "Plumbing", "Delivery", "Miscellaneous"
];

const schema = z.object({
  fullName: z.string().min(2, "Full name required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(7, "Phone number required"),
  areaLocation: z.string().min(2, "Area location required"),
  serviceTypes: z.array(z.string()).min(1, "Select at least 1 service").max(4, "Maximum 4 services"),
  kycConsent: z.boolean().refine(v => v, "You must agree to the terms"),
});
type FormData = z.infer<typeof schema>;

export default function WorkerRegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const register = useRegisterWorker();
  const [step, setStep] = useState(1);
  const [idFile, setIdFile] = useState<string>("");
  const [selfieFile, setSelfieFile] = useState<string>("");
  const [addressFile, setAddressFile] = useState<string>("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "", email: "", password: "", phone: "",
      areaLocation: "", serviceTypes: [], kycConsent: false,
    },
  });

  function toggleService(service: string) {
    const current = form.getValues("serviceTypes");
    if (current.includes(service)) {
      const updated = current.filter(s => s !== service);
      form.setValue("serviceTypes", updated);
      setSelectedServices(updated);
    } else if (current.length < 4) {
      const updated = [...current, service];
      form.setValue("serviceTypes", updated);
      setSelectedServices(updated);
    }
  }

  async function handleStep1() {
    const valid = await form.trigger(["fullName", "email", "password", "phone", "areaLocation", "serviceTypes"]);
    if (valid) setStep(2);
  }

  function onSubmit(data: FormData) {
    if (!idFile || !selfieFile) {
      toast({ title: "Documents required", description: "Please upload your ID and selfie.", variant: "destructive" });
      return;
    }
    register.mutate({ data: { ...data, serviceTypes: selectedServices } }, {
      onSuccess: (res) => {
        saveAuth(res.token, res.user);
        setDone(true);
      },
      onError: () => {
        toast({ title: "Registration failed", description: "Email may already be registered.", variant: "destructive" });
      },
    });
  }

  if (done) {
    return (
      <Layout>
        <section className="min-h-[80vh] flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-black uppercase mb-3">Application submitted!</h2>
            <p className="text-muted-foreground mb-6">Your KYC documents are being reviewed. You'll be notified once verified and can start accepting jobs.</p>
            <Button onClick={() => setLocation("/workers/dashboard")} className="bg-primary text-primary-foreground font-bold">Go to Dashboard</Button>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <span className="text-primary font-bold tracking-wider text-sm uppercase">Worker Portal</span>
            <h1 className="text-3xl font-black uppercase mt-2">Become a Worker</h1>
            <p className="text-muted-foreground mt-2">Step {step} of 2 — {step === 1 ? "Basic Information" : "KYC Verification"}</p>
          </div>

          {/* Progress */}
          <div className="flex gap-2 mb-8">
            <div className={`h-1 flex-1 rounded-full transition-all ${step >= 1 ? "bg-primary" : "bg-border"}`} />
            <div className={`h-1 flex-1 rounded-full transition-all ${step >= 2 ? "bg-primary" : "bg-border"}`} />
          </div>

          <div className="p-8 rounded-lg bg-card border border-border">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                {step === 1 && (
                  <div className="space-y-4">
                    <FormField control={form.control} name="fullName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input data-testid="input-fullname" placeholder="Your full name" {...field} className="bg-background border-border" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input data-testid="input-email" type="email" placeholder="your@email.com" {...field} className="bg-background border-border" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input data-testid="input-password" type="password" placeholder="At least 6 characters" {...field} className="bg-background border-border" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input data-testid="input-phone" placeholder="+267 71 234 567" {...field} className="bg-background border-border" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="areaLocation" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Area Location</FormLabel>
                        <FormControl>
                          <Input data-testid="input-area" placeholder="e.g. Gaborone West, Broadhurst, Phase 2" {...field} className="bg-background border-border" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="serviceTypes" render={() => (
                      <FormItem>
                        <FormLabel>Services you offer <span className="text-muted-foreground font-normal">(max 4)</span></FormLabel>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {SERVICE_OPTIONS.map((service) => {
                            const selected = selectedServices.includes(service);
                            return (
                              <button
                                key={service}
                                type="button"
                                data-testid={`checkbox-service-${service.toLowerCase().replace(/ /g, "-")}`}
                                onClick={() => toggleService(service)}
                                className={`text-left px-3 py-2 rounded-md text-sm font-medium transition-all border ${
                                  selected
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background border-border hover:border-primary/50 text-foreground"
                                } ${!selected && selectedServices.length >= 4 ? "opacity-40 cursor-not-allowed" : ""}`}
                              >
                                {service}
                              </button>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="button" onClick={handleStep1} className="w-full bg-primary text-primary-foreground font-bold">
                      Continue to KYC
                    </Button>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                      <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <p className="text-muted-foreground">
                        Your documents are used solely to verify your identity. They are stored securely and reviewed only by authorised Handled staff. By submitting, you agree to our Privacy Policy and Terms of Service.
                      </p>
                    </div>

                    {/* ID Upload */}
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-2">
                        Government-issued ID or Passport <span className="text-destructive">*</span>
                      </label>
                      <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${idFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-background"}`}>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          data-testid="input-id-document"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setIdFile(URL.createObjectURL(file));
                          }}
                        />
                        {idFile ? (
                          <span className="flex items-center gap-2 text-primary text-sm font-medium"><CheckCircle2 className="h-4 w-4" /> ID uploaded</span>
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                            <span className="text-sm text-muted-foreground">Click to upload ID</span>
                          </>
                        )}
                      </label>
                    </div>

                    {/* Selfie Upload */}
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-2">
                        Live Selfie Photo <span className="text-destructive">*</span>
                      </label>
                      <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${selfieFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-background"}`}>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          data-testid="input-selfie"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setSelfieFile(URL.createObjectURL(file));
                          }}
                        />
                        {selfieFile ? (
                          <span className="flex items-center gap-2 text-primary text-sm font-medium"><CheckCircle2 className="h-4 w-4" /> Selfie uploaded</span>
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                            <span className="text-sm text-muted-foreground">Click to upload selfie</span>
                          </>
                        )}
                      </label>
                    </div>

                    {/* Proof of address (optional) */}
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-2">
                        Proof of Address <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${addressFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-background"}`}>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          data-testid="input-proof-address"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setAddressFile(URL.createObjectURL(file));
                          }}
                        />
                        {addressFile ? (
                          <span className="flex items-center gap-2 text-primary text-sm font-medium"><CheckCircle2 className="h-4 w-4" /> Document uploaded</span>
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                            <span className="text-sm text-muted-foreground">Click to upload (optional)</span>
                          </>
                        )}
                      </label>
                    </div>

                    {/* Consent */}
                    <FormField control={form.control} name="kycConsent" render={({ field }) => (
                      <FormItem>
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            data-testid="checkbox-kyc-consent"
                            checked={field.value}
                            onChange={field.onChange}
                            className="mt-1 h-4 w-4 accent-primary"
                          />
                          <label className="text-sm text-muted-foreground">
                            I agree to the <span className="text-primary underline cursor-pointer">Privacy Policy</span> and <span className="text-primary underline cursor-pointer">Terms of Service</span>. I understand my documents will be securely reviewed by Handled staff.
                          </label>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="flex gap-3">
                      <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 border-border">
                        Back
                      </Button>
                      <Button
                        data-testid="button-submit-kyc"
                        type="submit"
                        className="flex-1 bg-primary text-primary-foreground font-bold"
                        disabled={register.isPending}
                      >
                        {register.isPending ? "Submitting..." : "Submit Application"}
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </Form>
            <p className="text-center text-sm text-muted-foreground mt-6">
              Already registered?{" "}
              <Link href="/workers/login" className="text-primary font-medium hover:underline">Log in</Link>
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
