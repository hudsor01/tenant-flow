"use client";

import { ArrowLeftRight, RefreshCw, DollarSign, TrendingUp, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  cn, 
  formatCurrency, 
  buttonClasses,
  cardClasses,
  ANIMATION_DURATIONS,
  TYPOGRAPHY_SCALE
} from "@/lib/utils";

function CurrencySelector(props: { defaultValue: string }) {
  return (
    <Select defaultValue={props.defaultValue}>
      <SelectTrigger size="sm" className="border-none shadow-none outline-none focus-visible:ring-0">
        <SelectValue placeholder="Currency" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="usd">USD</SelectItem>
        <SelectItem value="eur">EUR</SelectItem>
        <SelectItem value="gbp">GBP</SelectItem>
        <SelectItem value="aed">AED</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function CurrencyExchange() {
  return (
    <Card 
      className={cn(
        cardClasses(),
        "shadow-lg hover:shadow-xl border-2"
      )}
      style={{
        animation: `fadeIn ${ANIMATION_DURATIONS.slow} ease-out`,
        transition: `all ${ANIMATION_DURATIONS.default} ease-out`
      }}
    >
      <CardHeader 
        style={{
          animation: `slideInFromTop ${ANIMATION_DURATIONS.default} ease-out`
        }}
      >
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle 
              className="tracking-tight font-bold flex items-center gap-2"
              style={{
                fontSize: TYPOGRAPHY_SCALE['heading-lg'].fontSize,
                lineHeight: TYPOGRAPHY_SCALE['heading-lg'].lineHeight
              }}
            >
              Currency Exchange
              <Badge variant="secondary" className="text-xs font-medium">
                Live Rates
              </Badge>
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent 
        className="space-y-6"
        style={{
          animation: `slideInFromBottom ${ANIMATION_DURATIONS.default} ease-out`
        }}
      >
        <div 
          className="overflow-hidden rounded-xl border-2 shadow-md hover:shadow-lg transition-all bg-gradient-to-br from-muted/20 to-background"
          style={{
            transition: `all ${ANIMATION_DURATIONS.fast} ease-out`
          }}
        >
          <div className="border-b bg-muted/30 px-4 py-3">
            <div className="flex justify-between items-center">
              <div className="flex flex-1 justify-center">
                <CurrencySelector defaultValue="usd" />
              </div>
              <Separator orientation="vertical" className="!h-auto mx-2" />
              <div className="flex flex-1 items-center justify-center">
                <div 
                  className="bg-primary/10 p-2 rounded-full hover:bg-primary/20 transition-colors cursor-pointer"
                  style={{
                    transition: `all ${ANIMATION_DURATIONS.fast} ease-out`
                  }}
                >
                  <ArrowLeftRight className="text-primary size-4" />
                </div>
              </div>
              <Separator orientation="vertical" className="!h-auto mx-2" />
              <div className="flex flex-1 justify-center">
                <CurrencySelector defaultValue="eur" />
              </div>
            </div>
          </div>
          <div className="space-y-3 py-8 text-center tabular-nums bg-gradient-to-b from-background to-muted/10">
            <p 
              className="font-bold text-primary"
              style={{
                fontSize: TYPOGRAPHY_SCALE['display-xl'].fontSize,
                lineHeight: TYPOGRAPHY_SCALE['display-xl'].lineHeight,
                fontWeight: TYPOGRAPHY_SCALE['display-xl'].fontWeight,
                letterSpacing: TYPOGRAPHY_SCALE['display-xl'].letterSpacing
              }}
            >
              {formatCurrency(100.0)}
            </p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-muted-foreground text-sm font-medium">
                Available:
              </p>
              <span className="text-foreground font-bold text-green-600">
                {formatCurrency(13100.06)}
              </span>
            </div>
          </div>
          <div className="bg-muted/50 border-t py-2 text-center text-sm tabular-nums flex items-center justify-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-muted-foreground">1 USD = </span> 
            <span className="font-bold text-green-600">0.85 EUR</span>
            <Badge variant="secondary" className="text-xs">
              +0.02%
            </Badge>
          </div>
        </div>

        <div 
          className="space-y-3 p-4 bg-muted/20 rounded-xl border"
          style={{
            animation: `slideInFromLeft ${ANIMATION_DURATIONS.default} ease-out`
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground">Fee Breakdown</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between p-2 bg-background rounded-lg">
              <span className="text-muted-foreground">Tax (2%)</span>
              <span className="font-semibold tabular-nums text-orange-600">{formatCurrency(2)}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-background rounded-lg">
              <span className="text-muted-foreground">Exchange Fee (1%)</span>
              <span className="font-semibold tabular-nums text-blue-600">{formatCurrency(1)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between p-2 bg-primary/5 rounded-lg border">
              <span className="font-semibold">Total Amount</span>
              <span className="font-bold text-lg text-primary">{formatCurrency(82.77)}</span>
            </div>
          </div>
        </div>
        
        <Button 
          className={cn(
            buttonClasses('primary', 'lg'),
            "w-full gap-2 font-semibold hover:scale-105"
          )}
          style={{
            transition: `all ${ANIMATION_DURATIONS.fast} ease-out`
          }}
        >
          <RefreshCw className="size-4" /> 
          Exchange Currency
        </Button>
        
        <div className="text-center pt-2">
          <p className="text-xs text-muted-foreground">
            Rates updated every 30 seconds • Powered by live market data
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
