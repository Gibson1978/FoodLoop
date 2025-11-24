// src/types/user.ts
export type UserRole = 'donor' | 'recipient' | 'volunteer' | 'admin';

export const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'donor': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'receiver': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'volunteer': return 'bg-green-100 text-green-800 border-green-200';
      case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // utils/gradients.ts (or inline if you prefer)
export const getRoleGradientClasses = (role: string) => {
  switch (role) {
    case "donor":
      return "bg-gradient-to-br from-[#3b82f6] to-[#2563eb]"; // blue
    case "receiver":
      return "bg-gradient-to-r from-red-500 to-amber-500"; // orange
    case "volunteer":
      return "bg-gradient-to-r from-emerald-600 to-green-500"; // green
    case "admin":
      return "bg-gradient-to-br from-[#a855f7] to-[#9333ea]"; // purple
    default:
      return "bg-gradient-to-br from-[#6b7280] to-[#4b5563]"; // gray
  }
};

export const getRoleAccentColor = (role: string) => {
    switch (role) {
      case 'donor': return 'blue';
      case 'receiver': return 'orange';
      case 'volunteer': return 'green';
      case 'admin': return 'purple';
      default: return 'gray';
    }
  };

  export const getRoleBackgroundColor = (role: string) => {
  switch (role) {
    case "donor":
      return "bg-blue-50"; // blue
    case "receiver":
      return "bg-orange-50"; // orange
    case "volunteer":
      return "bg-green-50"; // green
    default:
      return "bg-gradient-to-br from-[#6b7280] to-[#4b5563]"; // gray
  }
};