import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import {
  BarChart3,
  Users,
  MessageSquare,
  Bot,
  Flag,
  Settings,
  User,
  Bell,
  LogOut,
  Leaf
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export function Sidebar({ activeTab, onTabChange, onLogout }: SidebarProps) {
  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: BarChart3,
      description: "Overview & Stats"
    },
    {
      id: "profile",
      label: "Profile",
      icon: User,
      description: "Account Settings"
    },
    {
      id: "chatbot",
      label: "AI Assistant",
      icon: Bot,
      description: "Data Insights"
    },
    {
      id: "reports",
      label: "Reports",
      icon: Flag,
      description: "User Complaints",
      badge: "3"
    },
    {
      id: "system",
      label: "System Controls",
      icon: Settings,
      description: "Manage Platform"
    }
  ];

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">FoodRedist</h2>
            <p className="text-sm text-muted-foreground">Admin Portal</p>
          </div>
        </div>
      </div>

      {/* User Profile Section */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src="/api/placeholder/100/100" alt="Admin" />
            <AvatarFallback className="bg-primary text-white">AD</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-medium text-foreground">Alex Johnson</h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                Admin
              </Badge>
              <div className="relative">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div className="absolute -top-1 -right-1 h-2 w-2 bg-orange-500 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant={activeTab === item.id ? "default" : "ghost"}
              className={`w-full justify-start h-auto p-3 ${
                activeTab === item.id 
                  ? "bg-primary text-white shadow-sm" 
                  : "text-foreground hover:bg-sidebar-accent"
              }`}
              onClick={() => onTabChange(item.id)}
            >
              <div className="flex items-center gap-3 w-full">
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.label}</span>
                    {item.badge && (
                      <Badge 
                        variant="destructive" 
                        className="text-xs h-5 w-5 p-0 flex items-center justify-center"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <p className={`text-xs ${
                    activeTab === item.id ? "text-white/80" : "text-muted-foreground"
                  }`}>
                    {item.description}
                  </p>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="outline"
          className="w-full justify-start text-foreground hover:bg-sidebar-accent"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}