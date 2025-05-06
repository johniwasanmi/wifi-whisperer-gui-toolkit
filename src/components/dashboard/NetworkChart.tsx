import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { Wifi, Users, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Network } from '@/types/network';
import { Client } from '@/types/client';

interface NetworkChartProps {
  networks: Network[];
  clients: Client[];
  isLoading?: boolean;
}

interface NetworkNode {
  id: string;
  type: 'ap' | 'client';
  label: string;
  x: number;
  y: number;
  radius: number;
  color: string;
}

interface NetworkLink {
  source: string;
  target: string;
  strength: number;
}

const NetworkChart: React.FC<NetworkChartProps> = ({ networks, clients, isLoading }) => {
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [links, setLinks] = useState<NetworkLink[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Adjust canvas size on resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        const { width, height } = canvasRef.current.parentElement.getBoundingClientRect();
        setCanvasSize({ width, height });
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update network topology when networks or clients change
  useEffect(() => {
    if (networks.length === 0) return;
    
    const newNodes: NetworkNode[] = [];
    const newLinks: NetworkLink[] = [];
    
    // Place APs in a circle
    const apCount = networks.length;
    const radius = Math.min(canvasSize.width, canvasSize.height) * 0.3;
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    
    // Add access points
    networks.forEach((network, index) => {
      const angle = (index / apCount) * Math.PI * 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      // Determine AP color based on encryption
      let color;
      switch (network.encryption) {
        case 'WPA3':
          color = 'rgb(34, 197, 94)'; // Green
          break;
        case 'WPA2':
          color = 'rgb(59, 130, 246)'; // Blue
          break;
        case 'WPA':
          color = 'rgb(234, 179, 8)'; // Yellow
          break;
        case 'WEP':
          color = 'rgb(239, 68, 68)'; // Red
          break;
        default:
          color = 'rgb(148, 163, 184)'; // Gray
      }
      
      newNodes.push({
        id: network.bssid,
        type: 'ap',
        label: network.ssid || `Hidden (${network.bssid})`,
        x,
        y,
        radius: 12 + (network.signal / 10),
        color
      });
    });
    
    // Add clients and connect to APs
    clients.forEach((client, index) => {
      if (client.bssid !== '(not associated)') {
        // Find the AP
        const apNode = newNodes.find(node => node.id === client.bssid);
        if (apNode) {
          const angle = Math.random() * Math.PI * 2;
          const distance = 40 + Math.random() * 30;
          const x = apNode.x + distance * Math.cos(angle);
          const y = apNode.y + distance * Math.sin(angle);
          
          newNodes.push({
            id: client.mac,
            type: 'client',
            label: client.vendor || client.mac,
            x,
            y,
            radius: 6,
            color: 'rgba(252, 165, 165, 0.7)'
          });
          
          newLinks.push({
            source: client.mac,
            target: client.bssid,
            strength: client.power || 50
          });
        }
      } else {
        // Unassociated clients float at the bottom
        const x = 50 + (canvasSize.width - 100) * (index % 5) / 5;
        const y = canvasSize.height - 50;
        
        newNodes.push({
          id: client.mac,
          type: 'client',
          label: client.vendor || client.mac,
          x,
          y,
          radius: 5,
          color: 'rgba(148, 163, 184, 0.7)'
        });
      }
    });
    
    setNodes(newNodes);
    setLinks(newLinks);
  }, [networks, clients, canvasSize]);
  
  // Draw the network chart
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    
    // Draw links
    ctx.lineWidth = 1;
    links.forEach(link => {
      const source = nodes.find(n => n.id === link.source);
      const target = nodes.find(n => n.id === link.target);
      
      if (source && target) {
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = `rgba(255, 255, 255, ${link.strength / 100})`;
        ctx.stroke();
      }
    });
    
    // Draw nodes
    nodes.forEach(node => {
      // Draw circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();
      
      // Draw wifi icon for APs
      if (node.type === 'ap') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('📶', node.x, node.y);
      }
      
      // Draw labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = node.type === 'ap' ? '10px sans-serif' : '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label.substring(0, 12), node.x, node.y + node.radius + 10);
    });
  }, [nodes, links, canvasSize]);

  return (
    <Card className="bg-melon-darkGreen/5 border-melon-green/40 shadow-md h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-melon-green flex items-center gap-2 text-lg">
            <Wifi className="h-5 w-5" />
            Network Topology
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold">{networks.length}</span> APs, 
              <span className="font-semibold ml-1">{clients.length}</span> Clients
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-melon-darkGreen hover:text-melon-green hover:bg-melon-darkGreen/10"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <CardDescription className="text-melon-gray">
          Visual map of access points and connected clients
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden">
        <div className="h-[300px] relative">
          {networks.length === 0 && !isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Users className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-muted-foreground text-center">
                No networks discovered yet.<br />Start scanning to visualize connections.
              </p>
            </div>
          )}
          
          {isLoading && networks.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <RefreshCw className="h-8 w-8 text-melon-green/40 animate-spin" />
            </div>
          )}
          
          <canvas 
            ref={canvasRef} 
            className="w-full h-full"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default NetworkChart;
