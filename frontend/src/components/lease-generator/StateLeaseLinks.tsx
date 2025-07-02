import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Star, Users } from 'lucide-react';
import { ALL_LEASE_DATA, TOP_5_STATES, INTERNATIONAL_LEASE_DATA, getStateUrlSlug } from '@/lib/state-data';

interface StateLeaseLinksProps {
  showAll?: boolean;
  showInternational?: boolean;
  className?: string;
}

export function StateLeaseLinks({ showAll = false, showInternational = false, className }: StateLeaseLinksProps) {
  // Show top 5 by default, or all states if requested
  const statesToShow = showAll 
    ? Object.entries(ALL_LEASE_DATA).filter(([key]) => !Object.keys(INTERNATIONAL_LEASE_DATA).includes(key)).sort((a, b) => b[1].searchVolume - a[1].searchVolume)
    : TOP_5_STATES.map(key => [key, ALL_LEASE_DATA[key]] as const);

  const internationalRegions = Object.entries(INTERNATIONAL_LEASE_DATA).sort((a, b) => b[1].searchVolume - a[1].searchVolume);

  return (
    <div className={className}>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">
          {showAll ? 'All State Lease Generators' : 'Popular State Lease Generators'}
        </h2>
        <p className="text-muted-foreground text-lg">
          Generate state-compliant lease agreements with all required legal disclosures
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statesToShow.map(([key, stateData]) => {
          const stateSlug = getStateUrlSlug(stateData.name);
          const isTopState = TOP_5_STATES.includes(key as typeof TOP_5_STATES[number]);
          
          return (
            <Card key={key} className="group hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-blue-300">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2">
                    {stateData.name}
                    {isTopState && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                        <Star className="h-3 w-3 mr-1" />
                        Popular
                      </Badge>
                    )}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {stateData.code}
                  </Badge>
                </div>
                <CardDescription className="text-sm line-clamp-2">
                  {stateData.metaDescription}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* State Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="font-medium">{stateData.marketSize}k</div>
                      <div className="text-xs text-muted-foreground">rental units</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="font-medium">{stateData.searchVolume.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">monthly searches</div>
                    </div>
                  </div>
                </div>

                {/* Key Legal Requirements */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Key Requirements:</h4>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• Entry notice: {stateData.legalRequirements.noticeToEnter}</li>
                    <li>• Termination: {stateData.legalRequirements.noticePeriod}</li>
                    {stateData.legalRequirements.securityDepositLimit !== 'No statutory limit' && (
                      <li>• Security deposit: {stateData.legalRequirements.securityDepositLimit}</li>
                    )}
                  </ul>
                </div>

                {/* CTA Button */}
                <Link to={`/lease-generator/${stateSlug}`} className="block">
                  <Button 
                    className="w-full group-hover:bg-blue-600 group-hover:text-white transition-colors"
                    variant={isTopState ? "default" : "outline"}
                  >
                    Generate {stateData.name} Lease
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!showAll && (
        <div className="text-center mt-8">
          <Link to="/lease-generator/states">
            <Button variant="outline" size="lg">
              View All 50 States
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      )}

      {/* International Regions Section */}
      {(showInternational || internationalRegions.length > 0) && (
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">
              International Lease Generators
            </h2>
            <p className="text-muted-foreground text-lg">
              Generate compliant lease agreements for international markets
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {internationalRegions.map(([key, regionData]) => {
              const regionSlug = getStateUrlSlug(regionData.name);
              
              return (
                <Card key={key} className="group hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-blue-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl flex items-center gap-2">
                        {regionData.name}
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          <Star className="h-3 w-3 mr-1" />
                          International
                        </Badge>
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {regionData.code}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm line-clamp-2">
                      {regionData.metaDescription}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Region Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="font-medium">{regionData.marketSize}k</div>
                          <div className="text-xs text-muted-foreground">rental units</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-green-600" />
                        <div>
                          <div className="font-medium">{regionData.searchVolume.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">monthly searches</div>
                        </div>
                      </div>
                    </div>

                    {/* Key Legal Requirements */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Key Requirements:</h4>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• Entry notice: {regionData.legalRequirements.noticeToEnter}</li>
                        <li>• Termination: {regionData.legalRequirements.noticePeriod}</li>
                        {regionData.legalRequirements.securityDepositLimit !== 'No statutory limit' && (
                          <li>• Security deposit: {regionData.legalRequirements.securityDepositLimit}</li>
                        )}
                      </ul>
                    </div>

                    {/* CTA Button */}
                    <Link to={`/lease-generator/${regionSlug}`} className="block">
                      <Button 
                        className="w-full group-hover:bg-blue-600 group-hover:text-white transition-colors"
                        variant="default"
                      >
                        Generate {regionData.name} Lease
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default StateLeaseLinks;