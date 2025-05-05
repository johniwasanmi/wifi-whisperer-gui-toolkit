
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

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-0">
          <div className="flex items-center p-4 border-b border-cyber-gray">
            <SidebarTrigger />
            <div className="ml-4 flex items-center">
              <span className="font-bold text-lg text-cyber-blue">WiFi Whisperer</span>
              <span className="text-xs ml-2 text-muted-foreground">v0.1</span>
            </div>
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
    <Sidebar className="border-r border-cyber-gray">
      <SidebarHeader className="p-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-cyber-blue flex items-center justify-center">
            <Wifi size={18} className="text-cyber-dark" />
          </div>
          <div>
            <h3 className="font-bold tracking-tight">WiFi Whisperer</h3>
            <p className="text-xs text-muted-foreground">Exploitation Framework</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild>
                    <Link to={item.path} className="flex items-center">
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
        <div className="text-xs text-muted-foreground">
          <p>WiFi Whisperer &copy; 2025</p>
          <p>For educational purposes only</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
