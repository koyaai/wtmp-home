import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Link, RefreshCw, MapPin, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function GBPConnect() {
    const [connecting, setConnecting] = useState(false);
    const [loadingLocations, setLoadingLocations] = useState(false);
    const [locations, setLocations] = useState([]);
    const queryClient = useQueryClient();

    const { data: settings } = useQuery({
        queryKey: ['gbpSettings'],
        queryFn: () => base44.entities.GBPSettings.list(),
        select: (d) => d[0] || null,
    });

    const { data: profiles = [] } = useQuery({
        queryKey: ['gbpProfiles'],
        queryFn: () => base44.entities.GBPProfile.list(),
    });

    const isConnected = settings?.connected;

    const handleConnect = async () => {
        setConnecting(true);
        try {
            const res = await base44.functions.invoke('gbpAuth');
            const { auth_url } = res.data;
            const popup = window.open(auth_url, 'GBP Auth', 'width=600,height=700');

            const handler = (e) => {
                if (e.data?.type === 'GBP_AUTH_SUCCESS') {
                    toast.success('Google Business Profile connected!');
                    queryClient.invalidateQueries({ queryKey: ['gbpSettings'] });
                    window.removeEventListener('message', handler);
                    setConnecting(false);
                } else if (e.data?.type === 'GBP_AUTH_ERROR') {
                    toast.error(`Connection failed: ${e.data.error}`);
                    window.removeEventListener('message', handler);
                    setConnecting(false);
                }
            };
            window.addEventListener('message', handler);

            // Fallback: close check
            const interval = setInterval(() => {
                if (popup?.closed) {
                    clearInterval(interval);
                    window.removeEventListener('message', handler);
                    setConnecting(false);
                    queryClient.invalidateQueries({ queryKey: ['gbpSettings'] });
                }
            }, 1000);
        } catch (err) {
            toast.error(err.message);
            setConnecting(false);
        }
    };

    const handleLoadLocations = async () => {
        setLoadingLocations(true);
        try {
            const res = await base44.functions.invoke('gbpGetLocations');
            setLocations(res.data.locations || []);
            if (!res.data.locations?.length) toast.info('No locations found on this Google account.');
        } catch (err) {
            toast.error(err.message);
        }
        setLoadingLocations(false);
    };

    const handleLinkLocation = async (profileId, locationName, accountName) => {
        await base44.entities.GBPProfile.update(profileId, {
            gbp_location_name: locationName,
            gbp_account_name: accountName,
        });
        queryClient.invalidateQueries({ queryKey: ['gbpProfiles'] });
        toast.success('Location linked!');
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Google Business Profile Connection</h1>
                <p className="text-slate-500 text-sm mt-1">Connect your agency Google account to manage all client GBP locations.</p>
            </div>

            {/* Connection Status */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-slate-300'}`} />
                        Connection Status
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isConnected ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <div>
                                    <p className="font-medium text-slate-800">Connected</p>
                                    <p className="text-xs text-slate-500">
                                        Connected on {settings?.connected_at ? new Date(settings.connected_at).toLocaleDateString() : 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleConnect} disabled={connecting}>
                                <RefreshCw className="w-4 h-4 mr-1" /> Reconnect
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <p className="text-slate-600 text-sm">Not connected. Click to authorize with your agency Google account.</p>
                            <Button onClick={handleConnect} disabled={connecting} className="bg-blue-600 hover:bg-blue-700">
                                {connecting ? 'Connecting...' : 'Connect Google Account'}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Locations */}
            {isConnected && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> Managed Locations
                        </CardTitle>
                        <Button variant="outline" size="sm" onClick={handleLoadLocations} disabled={loadingLocations}>
                            <RefreshCw className={`w-4 h-4 mr-1 ${loadingLocations ? 'animate-spin' : ''}`} />
                            {loadingLocations ? 'Loading...' : 'Load Locations'}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {locations.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-6">Click "Load Locations" to fetch all GBP locations from your Google account.</p>
                        ) : (
                            <div className="space-y-3">
                                {locations.map((loc) => {
                                    const linkedProfile = profiles.find(p => p.gbp_location_name === loc.name);
                                    return (
                                        <div key={loc.name} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                                            <div>
                                                <p className="font-medium text-slate-800">{loc.title}</p>
                                                <p className="text-xs text-slate-500">{loc.name}</p>
                                                {loc.storefrontAddress && (
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        {[loc.storefrontAddress.addressLines?.[0], loc.storefrontAddress.locality, loc.storefrontAddress.administrativeArea].filter(Boolean).join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                                                {linkedProfile ? (
                                                    <Badge className="bg-green-100 text-green-800 text-xs">
                                                        <Link className="w-3 h-3 mr-1" />
                                                        {linkedProfile.client_name}
                                                    </Badge>
                                                ) : (
                                                    <Select onValueChange={(profileId) => handleLinkLocation(profileId, loc.name, loc.accountName)}>
                                                        <SelectTrigger className="w-44 h-8 text-xs">
                                                            <SelectValue placeholder="Link to profile..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {profiles.map(p => (
                                                                <SelectItem key={p.id} value={p.id}>{p.client_name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Instructions */}
            <Card className="border-blue-100 bg-blue-50">
                <CardContent className="pt-4">
                    <p className="text-sm font-medium text-blue-800 mb-2">Before connecting, make sure:</p>
                    <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                        <li>The <strong>Google Business Profile API</strong> is enabled in your Google Cloud project</li>
                        <li>Your OAuth consent screen has the <code className="bg-blue-100 px-1 rounded">business.manage</code> scope</li>
                        <li>Your agency Google account is added as a <strong>Test User</strong> (if app is in test mode)</li>
                        <li>The redirect URI <code className="bg-blue-100 px-1 rounded text-xs">{window.location.origin}/api/functions/gbpAuthCallback</code> is added in Google Cloud Console</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}