import { Layout } from "@/components/layout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegisterCustomer } from "@workspace/api-client-react";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { saveAuth } from "@/lib/auth";

const schema = z.object({
  fullName: z.string().min(2, "Full name required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(7, "Phone number required"),
});
type FormData = z.infer<typeof schema>;

export default function CustomerRegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const register = useRegisterCustomer();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", password: "", phone: "" },
  });

  function onSubmit(data: FormData) {
    register.mutate({ data }, {
      onSuccess: (res) => {
        saveAuth(res.token, res.user);
        toast({ title: "Account created!", description: "Welcome to Handled." });
        setLocation("/customers/post-job");
      },
      onError: () => {
        toast({ title: "Registration failed", description: "Email may already be registered.", variant: "destructive" });
      },
    });
  }

  return (
    <Layout>
      <section className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <span className="text-primary font-bold tracking-wider text-sm uppercase">Customer Portal</span>
            <h1 className="text-3xl font-black uppercase mt-2">Create Account</h1>
            <p className="text-muted-foreground mt-2">Register to post your first job</p>
          </div>
          <div className="p-8 rounded-lg bg-card border border-border">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <Button data-testid="button-register" type="submit" className="w-full bg-primary text-primary-foreground font-bold" disabled={register.isPending}>
                  {register.isPending ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </Form>
            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link href="/customers/login" className="text-primary font-medium hover:underline">Log in</Link>
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
