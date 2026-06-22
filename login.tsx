import { Layout } from "@/components/layout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { saveAuth } from "@/lib/auth";

const schema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password required"),
});
type FormData = z.infer<typeof schema>;

export default function WorkerLoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const login = useLogin();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(data: FormData) {
    login.mutate({ data: { ...data, role: "worker" } }, {
      onSuccess: (res) => {
        saveAuth(res.token, res.user);
        toast({ title: "Welcome back!", description: `Logged in as ${res.user.fullName}` });
        setLocation("/workers/dashboard");
      },
      onError: () => {
        toast({ title: "Login failed", description: "Invalid email or password.", variant: "destructive" });
      },
    });
  }

  return (
    <Layout>
      <section className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <span className="text-primary font-bold tracking-wider text-sm uppercase">Worker Portal</span>
            <h1 className="text-3xl font-black uppercase mt-2">Worker Login</h1>
            <p className="text-muted-foreground mt-2">Access your job dashboard</p>
          </div>
          <div className="p-8 rounded-lg bg-card border border-border">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
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
                      <Input data-testid="input-password" type="password" placeholder="••••••••" {...field} className="bg-background border-border" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button data-testid="button-login" type="submit" className="w-full bg-primary text-primary-foreground font-bold" disabled={login.isPending}>
                  {login.isPending ? "Logging in..." : "Log In"}
                </Button>
              </form>
            </Form>
            <p className="text-center text-sm text-muted-foreground mt-6">
              No account?{" "}
              <Link href="/workers/register" className="text-primary font-medium hover:underline">Register as a Worker</Link>
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
