import { Layout } from "@/components/layout";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateJob } from "@workspace/api-client-react";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { MapPin, Calculator } from "lucide-react";
import { getToken } from "@/lib/auth";
import { Link } from "wouter";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const SERVICE_TIERS: Record<string, { name: string; price: number }[]> = {
  "House Cleaning": [
    { name: "Single room", price: 120 }, { name: "1 bedroom", price: 180 },
    { name: "2 bedroom", price: 250 }, { name: "3 bedroom", price: 350 },
    { name: "4+ bedroom", price: 450 },
  ],
  "Gardening": [
    { name: "Small (townhouse/front)", price: 120 }, { name: "Medium (standard)", price: 220 },
    { name: "Large (large residential)", price: 350 }, { name: "Extra Large (plot/estate)", price: 500 },
  ],
  "Moving Assistance": [
    { name: "Single item", price: 350 }, { name: "Room Move", price: 300 },
    { name: "Small house", price: 600 }, { name: "Large house", price: 1000 },
  ],
  "Handyman": [
    { name: "Simple fix", price: 120 }, { name: "Furniture Assembly", price: 180 },
    { name: "TV Mounting", price: 250 }, { name: "General Repairs (hourly)", price: 150 },
  ],
  "Plumbing": [
    { name: "Simple fix", price: 120 }, { name: "Diagnose & Quote", price: 180 },
    { name: "Standard repair", price: 250 }, { name: "General Repairs (hourly)", price: 150 },
  ],
  "Delivery": [
    { name: "Small package", price: 50 }, { name: "Medium package", price: 80 },
    { name: "Heavy/bulky item", price: 150 },
  ],
  "Miscellaneous": [{ name: "Custom quote", price: 150 }],
};

function MapPicker({ lat, lng, onPick }: { lat: number; lng: number; onPick: (lat: number, lng: number) => void }) {
  function ClickHandler() {
    useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
    return null;
  }
  return (
    <MapContainer center={[lat, lng]} zoom={13} style={{ height: "280px", borderRadius: "8px" }} className="z-0">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler />
      <Marker position={[lat, lng]} />
    </MapContainer>
  );
}

const schema = z.object({
  serviceType: z.string().min(1, "Select a service"),
  serviceTier: z.string().optional(),
  description: z.string().min(10, "Please describe the job (at least 10 characters)"),
  preferredDate: z.string().min(1, "Date required"),
  preferredTime: z.string().min(1, "Time required"),
  transportZone: z.enum(["inside_gaborone", "outside_gaborone"]),
});
type FormData = z.infer<typeof schema>;

export default function PostJobPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createJob = useCreateJob();
  const token = getToken();

  const [mapLat, setMapLat] = useState(-24.6282);
  const [mapLng, setMapLng] = useState(25.9231);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      serviceType: "", serviceTier: "", description: "",
      preferredDate: "", preferredTime: "", transportZone: "inside_gaborone",
    },
  });

  const serviceType = form.watch("serviceType");
  const serviceTier = form.watch("serviceTier");
  const transportZone = form.watch("transportZone");

  const tiers = SERVICE_TIERS[serviceType] ?? [];
  const selectedTier = tiers.find(t => t.name === serviceTier);
  const transportFee = transportZone === "inside_gaborone" ? 30 : 50;
  const basePrice = selectedTier?.price ?? 0;
  const platformFee = basePrice > 0 ? Math.round(basePrice * 0.15 * 100) / 100 : 0;
  const total = basePrice > 0 ? basePrice + transportFee + platformFee : 0;

  if (!token) {
    return (
      <Layout>
        <section className="min-h-[80vh] flex items-center justify-center px-4">
          <div className="text-center">
            <h2 className="text-2xl font-black mb-4">Login required</h2>
            <p className="text-muted-foreground mb-6">Please log in or register to post a job.</p>
            <div className="flex gap-4 justify-center">
              <Link href="/customers/login"><Button className="bg-primary text-primary-foreground font-bold">Log In</Button></Link>
              <Link href="/customers/register"><Button variant="outline">Register</Button></Link>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  function onSubmit(data: FormData) {
    createJob.mutate({
      data: {
        serviceType: data.serviceType,
        serviceTier: data.serviceTier || null,
        description: data.description,
        preferredDate: data.preferredDate,
        preferredTime: data.preferredTime,
        locationLat: mapLat,
        locationLng: mapLng,
        locationAddress: null,
        transportZone: data.transportZone,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Job posted!", description: "Workers will review your job soon." });
        setLocation("/customers/dashboard");
      },
      onError: () => {
        toast({ title: "Error", description: "Could not post job. Please try again.", variant: "destructive" });
      },
    });
  }

  return (
    <Layout>
      <section className="py-12 px-4">
        <div className="container max-w-2xl mx-auto">
          <div className="mb-8">
            <span className="text-primary font-bold tracking-wider text-sm uppercase">Post a Job</span>
            <h1 className="text-3xl font-black uppercase mt-1">What do you need done?</h1>
            <p className="text-muted-foreground mt-2">Fill in the details and verified workers will see your request.</p>
          </div>

          <div className="p-8 rounded-lg bg-card border border-border">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Service Type */}
                <FormField control={form.control} name="serviceType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type</FormLabel>
                    <Select onValueChange={(v) => { field.onChange(v); form.setValue("serviceTier", ""); }} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-service-type" className="bg-background border-border">
                          <SelectValue placeholder="Select a service..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.keys(SERVICE_TIERS).map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Service Tier */}
                {tiers.length > 0 && (
                  <FormField control={form.control} name="serviceTier" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Tier</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-service-tier" className="bg-background border-border">
                            <SelectValue placeholder="Select tier..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tiers.map((t) => (
                            <SelectItem key={t.name} value={t.name}>{t.name} — P{t.price}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                {/* Description */}
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Describe the job</FormLabel>
                    <FormControl>
                      <Textarea
                        data-testid="input-description"
                        placeholder="Describe exactly what you need done, any special requirements, access details, etc."
                        rows={4}
                        {...field}
                        className="bg-background border-border resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="preferredDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Date</FormLabel>
                      <FormControl>
                        <Input data-testid="input-date" type="date" {...field} className="bg-background border-border" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="preferredTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Time</FormLabel>
                      <FormControl>
                        <Input data-testid="input-time" type="time" {...field} className="bg-background border-border" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Transport Zone */}
                <FormField control={form.control} name="transportZone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Zone</FormLabel>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: "inside_gaborone", label: "Inside Gaborone", fee: "P30 transport" },
                        { value: "outside_gaborone", label: "Outside Gaborone", fee: "P50 transport" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          data-testid={`radio-zone-${opt.value}`}
                          onClick={() => field.onChange(opt.value)}
                          className={`p-4 rounded-lg border text-left transition-all ${field.value === opt.value ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/50"}`}
                        >
                          <MapPin className={`h-4 w-4 mb-1 ${field.value === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                          <p className="font-bold text-sm">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.fee} added</p>
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Map */}
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    <MapPin className="h-4 w-4 inline mr-1 text-primary" />
                    Pin job location on map
                  </label>
                  <p className="text-xs text-muted-foreground mb-3">Click on the map to place a pin at the job location</p>
                  <MapPicker lat={mapLat} lng={mapLng} onPick={(lat, lng) => { setMapLat(lat); setMapLng(lng); }} />
                  <p className="text-xs text-muted-foreground mt-2">
                    Pinned: {mapLat.toFixed(5)}, {mapLng.toFixed(5)}
                  </p>
                </div>

                {/* Price Estimate */}
                {basePrice > 0 && (
                  <div className="p-4 rounded-lg bg-background border border-primary/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Calculator className="h-4 w-4 text-primary" />
                      <span className="font-bold text-sm">Price Estimate</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Base price ({serviceTier})</span><span>P{basePrice}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Transport fee</span><span>P{transportFee}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Platform fee (15%)</span><span>P{platformFee}</span></div>
                      <div className="flex justify-between font-black text-primary text-base pt-2 border-t border-border mt-2">
                        <span>Total</span><span>P{total}</span>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  data-testid="button-post-job"
                  type="submit"
                  className="w-full bg-primary text-primary-foreground font-bold h-12 text-base"
                  disabled={createJob.isPending}
                >
                  {createJob.isPending ? "Posting job..." : "Post Job"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </section>
    </Layout>
  );
}
