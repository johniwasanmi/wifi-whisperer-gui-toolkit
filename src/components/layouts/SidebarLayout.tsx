
import React from "react";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton, 
  SidebarProvider, 
  SidebarTrigger 
} from "@/components/ui/sidebar";
import { Wifi, Zap, Shield, Terminal, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import WatermelonLogo from "@/components/logo/WatermelonLogo";
import ThemeToggle from "@/components/common/ThemeToggle";

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full dark:bg-melon-darkBg">
        <AppSidebar />
        <main className="flex-1 p-0">
          <div className="flex justify-between items-center p-4 border-b border-melon-green dark:border-melon-darkGreenAccent">
            <div className="flex items-center">
              <SidebarTrigger />
              <div className="ml-4 flex items-center">
                <span className="font-bold text-lg text-melon-red dark:text-melon-red">WiFiMellon</span>
                <span className="text-xs ml-2 text-muted-foreground">v0.1</span>
              </div>
            </div>
            <ThemeToggle />
          </div>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

function AppSidebar() {
  const menuItems = [
    {
      title: "Dashboard",
      path: "/",
      icon: Wifi,
    },
    {
      title: "Attack Modules",
      path: "/attacks",
      icon: Zap,
    },
    {
      title: "Defenses",
      path: "/defenses",
      icon: Shield,
    },
    {
      title: "Console",
      path: "/console",
      icon: Terminal,
    },
    {
      title: "Settings",
      path: "/settings",
      icon: Settings,
    },
  ];

  return (
    <Sidebar className="border-r border-melon-darkGreen bg-melon-green/90 dark:bg-melon-darkGreenAccent dark:border-melon-darkBorder">
      <SidebarHeader className="p-4">
        <div className="flex items-center space-x-2">
          <WatermelonLogo size={40} />
          <div>
            <h3 className="font-bold tracking-tight text-white">WiFiMellon</h3>
            <p className="text-xs text-white/70">Exploitation Framework</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/80">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild>
                    <Link to={item.path} className="flex items-center text-white hover:bg-melon-darkGreen/50 hover:text-white dark:hover:bg-melon-darkGreenAccent/50">
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="text-xs text-white/70">
          <p>WiFiMellon &copy; 2025</p>
          <p>For educational purposes only</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
