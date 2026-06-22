import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MapPin, Camera, Clock, Shield } from "lucide-react";

export default function CustomersPage() {
  return (
    <Layout>
      <section className="py-20 px-4">
        <div className="container max-w-4xl mx-auto text-center">
          <span className="text-primary font-bold tracking-wider text-sm uppercase">For Customers</span>
          <h1 className="text-4xl md:text-5xl font-black uppercase mt-2 mb-6">Post a job in minutes</h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Choose a service, pin your location on the map, describe the job, and get connected with a KYC-verified worker in your area.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/customers/register">
              <Button className="bg-primary text-primary-foreground font-bold px-8 h-12" data-testid="button-register-customer">Register to Post a Job</Button>
            </Link>
            <Link href="/customers/login">
              <Button variant="outline" className="border-border font-bold px-8 h-12" data-testid="button-login-customer">Already have an account</Button>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: MapPin, title: "Pin your location", desc: "Drop a pin on the map to show where the job is." },
              { icon: Shield, title: "Verified workers only", desc: "Only KYC-verified workers can accept your job." },
              { icon: Camera, title: "Before & after photos", desc: "Both sides upload photos for full accountability." },
              { icon: Clock, title: "Pick date & time", desc: "Choose when you need the work done." },
            ].map((item) => (
              <div key={item.title} className="p-6 rounded-lg bg-card border border-border text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
