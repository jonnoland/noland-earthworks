/**
 * Settings Page — Noland Earthworks
 * Account, business, and notification settings
 */

import DashboardLayout from "@/components/OpsDashboardLayout";
import { useState } from "react";
import { Save, User, Building2, Bell, Shield, CreditCard, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "business", label: "Business", icon: Building2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "team", label: "Team", icon: Users },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "security", label: "Security", icon: Shield },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [name, setName] = useState("Jake Dawson");
  const [email, setEmail] = useState("jake@bearclawland.com");
  const [phone, setPhone] = useState("(720) 555-0142");
  const [company, setCompany] = useState("Noland Earthworks, LLC");
  const [location, setLocation] = useState("Evergreen, CO");
  const [crewDayTarget, setCrewDayTarget] = useState("3500");
  const [monthlyTarget, setMonthlyTarget] = useState("75000");

  const handleSave = () => {
    toast.success("Settings saved successfully");
  };

  return (
    <DashboardLayout title="Settings" subtitle="Manage your account and business preferences">
      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Sidebar tabs */}
          <div className="lg:w-48 shrink-0">
            <nav className="space-y-0.5">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-xs font-medium transition-all text-left",
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5 shrink-0" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {activeTab === "profile" && (
              <div className="ops-card p-5 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Profile Information
                  </h3>
                  <p className="text-xs text-muted-foreground">Update your personal details</p>
                </div>

                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">JD</span>
                  </div>
                  <div>
                    <button
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                      onClick={() => toast.info("Photo upload — coming soon")}
                    >
                      Change photo
                    </button>
                    <p className="text-[11px] text-muted-foreground mt-0.5">JPG, PNG up to 2MB</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "Full Name", value: name, onChange: setName },
                    { label: "Email Address", value: email, onChange: setEmail },
                    { label: "Phone Number", value: phone, onChange: setPhone },
                    { label: "Location", value: location, onChange: setLocation },
                  ].map((field) => (
                    <div key={field.label}>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{field.label}</label>
                      <input
                        type="text"
                        value={field.value}
                        onChange={e => field.onChange(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-md transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === "business" && (
              <div className="ops-card p-5 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Business Settings
                  </h3>
                  <p className="text-xs text-muted-foreground">Configure your business targets and preferences</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "Company Name", value: company, onChange: setCompany },
                    { label: "Business Location", value: location, onChange: setLocation },
                    { label: "Monthly Revenue Target ($)", value: monthlyTarget, onChange: setMonthlyTarget },
                    { label: "Target Crew-Day Rate ($)", value: crewDayTarget, onChange: setCrewDayTarget },
                  ].map((field) => (
                    <div key={field.label}>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{field.label}</label>
                      <input
                        type="text"
                        value={field.value}
                        onChange={e => field.onChange(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Service Area</label>
                  <div className="flex flex-wrap gap-2">
                    {["Land Clearing", "Forestry Mulching", "Brush Removal", "Stump Grinding", "Wildfire Mitigation"].map(service => (
                      <span key={service} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary cursor-pointer hover:bg-primary/20 transition-colors">
                        {service}
                      </span>
                    ))}
                    <button
                      className="text-[11px] font-medium px-2.5 py-1 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
                      onClick={() => toast.info("Add service — coming soon")}
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-md transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              </div>
            )}

            {(activeTab === "notifications" || activeTab === "team" || activeTab === "billing" || activeTab === "security") && (
              <div className="ops-card p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  {(() => {
                    const tab = tabs.find(t => t.id === activeTab);
                    return tab ? <tab.icon className="w-5 h-5 text-primary" /> : null;
                  })()}
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {tabs.find(t => t.id === activeTab)?.label} Settings
                </h3>
                <p className="text-xs text-muted-foreground">This section is coming soon in the next update.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
