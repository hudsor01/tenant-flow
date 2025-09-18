import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { GoogleButton } from "@/components/auth/google-button";

export default function Login02() {
  return (
    <div className="tw-:flex tw-:items-center tw-:justify-center tw-:min-h-screen">
      <div className="tw-:flex tw-:flex-1 tw-:flex-col tw-:justify-center tw-:px-4 tw-:py-10 tw-:lg:px-6">
        <div className="tw-:sm:mx-auto tw-:sm:w-full tw-:sm:max-w-sm">
          <h2 className="tw-:text-center tw-:text-xl tw-:font-semibold tw-:text-foreground">
            Log in or create account
          </h2>
          <form action="#" method="post" className="tw-:mt-6 tw-:space-y-4">
            <div>
              <Label
                htmlFor="email-login-02"
                className="tw-:text-sm tw-:font-medium tw-:text-foreground tw-:dark:text-foreground"
              >
                Email
              </Label>
              <Input
                type="email"
                id="email-login-02"
                name="email-login-02"
                autoComplete="email"
                placeholder="ephraim@blocks.so"
                className="tw-:mt-2"
              />
            </div>
            <div>
              <Label
                htmlFor="password-login-02"
                className="tw-:text-sm tw-:font-medium tw-:text-foreground tw-:dark:text-foreground"
              >
                Password
              </Label>
              <Input
                type="password"
                id="password-login-02"
                name="password-login-02"
                autoComplete="password"
                placeholder="**************"
                className="tw-:mt-2"
              />
            </div>
            <Button type="submit" className="tw-:mt-4 tw-:w-full tw-:py-2 tw-:font-medium">
              Sign in
            </Button>
          </form>

          <div className="tw-:relative tw-:my-6">
            <div className="tw-:absolute tw-:inset-0 tw-:flex tw-:items-center">
              <Separator className="tw-:w-full" />
            </div>
            <div className="tw-:relative tw-:flex tw-:justify-center tw-:text-xs tw-:uppercase">
              <span className="tw-:bg-background tw-:px-2 tw-:text-muted-foreground">
                or with
              </span>
            </div>
          </div>

          <GoogleButton
            mode="login"
            showTrustIndicators={true}
            className="tw-:w-full"
          />

          <p className="tw-:mt-4 tw-:text-xs tw-:text-muted-foreground tw-:dark:text-muted-foreground">
            By signing in, you agree to our{" "}
            <a href="#" className="tw-:underline tw-:underline-offset-4">
              terms of service
            </a>{" "}
            and{" "}
            <a href="#" className="tw-:underline tw-:underline-offset-4">
              privacy policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
