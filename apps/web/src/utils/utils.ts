import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { User } from "../context/AuthContext";
import { filterEmployeesByRole } from "./roleBasedAccess";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getVisibleEmployees(user: User | null, activeRole: string, employees: any[]) {
  if (!user) return [];
  
  // Use the new role-based filtering
  return filterEmployeesByRole(employees, user);
}











