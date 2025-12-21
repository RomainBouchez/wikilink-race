import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from './ui/sidebar';
import { User, Trophy, Calendar, Dumbbell, Home, LogIn } from 'lucide-react';

interface AppSidebarProps {
  onNavigateHome?: () => void;
  onShowLeaderboard?: () => void;
}

export function AppSidebar({ onNavigateHome, onShowLeaderboard }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Home className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold">WikiLink Race</p>
            <p className="text-xs text-muted-foreground">6 degrés de séparation</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onNavigateHome}>
                  <Home className="h-4 w-4" />
                  <span>Accueil</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onShowLeaderboard}>
                  <Trophy className="h-4 w-4" />
                  <span>Classement</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Modes de jeu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Calendar className="h-4 w-4" />
                  <span>Défi quotidien</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Dumbbell className="h-4 w-4" />
                  <span>Entraînement</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Compte (bientôt disponible)</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton disabled className="opacity-50">
                  <LogIn className="h-4 w-4" />
                  <span>Se connecter</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton disabled className="opacity-50">
                  <User className="h-4 w-4" />
                  <span>Créer un compte</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-4 py-2 text-xs text-muted-foreground">
          <p>Version 1.0.0</p>
          <p>Propulsé par Wikipedia API</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
