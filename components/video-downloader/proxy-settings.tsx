
"use client";

import React, { useState, useEffect } from 'react';
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PROXY_CONFIG } from '@/config/proxy';

const ProxySettings = () => {
  const [useProxy, setUseProxy] = useState(false);
  const [proxyUrl, setProxyUrl] = useState('');


  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const storedUseProxy = localStorage.getItem('useProxy');
      const storedProxyUrl = localStorage.getItem('proxyUrl');
      
      const initialUseProxy = storedUseProxy ? JSON.parse(storedUseProxy) : PROXY_CONFIG.useProxy;
      const initialProxyUrl = storedProxyUrl || PROXY_CONFIG.proxyUrl;

      setUseProxy(initialUseProxy);
      setProxyUrl(initialProxyUrl);

      PROXY_CONFIG.useProxy = initialUseProxy;
      PROXY_CONFIG.proxyUrl = initialProxyUrl;
    }
  }, [isClient]);

  const handleProxyToggle = (checked: boolean) => {
    setUseProxy(checked);
    PROXY_CONFIG.useProxy = checked;
    localStorage.setItem('useProxy', JSON.stringify(checked));
  };

  const handleProxyUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = event.target.value;
    setProxyUrl(newUrl);
    PROXY_CONFIG.proxyUrl = newUrl;
    localStorage.setItem('proxyUrl', newUrl);
  };

  if (!isClient) {
    return null; // Render nothing on the server
  }

  return (
    <div className="p-4 border border-gray-700 rounded-lg mt-8">
      <h2 className="text-lg font-semibold mb-4 text-white">Proxy Settings</h2>
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Switch
            id="proxy-toggle"
            checked={useProxy}
            onCheckedChange={handleProxyToggle}
          />
          <Label htmlFor="proxy-toggle" className="text-gray-300">
            Use Proxy
          </Label>
        </div>
        {useProxy && (
          <div className="space-y-2 animate-in fade-in-0 slide-in-from-top-2 duration-300">
            <Label htmlFor="proxy-url" className="text-gray-400">
              Proxy URL
            </Label>
            <Input
              id="proxy-url"
              type="text"
              value={proxyUrl}
              onChange={handleProxyUrlChange}
              placeholder="e.g., http://localhost:8080"
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProxySettings;

