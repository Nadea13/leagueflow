'use client'

import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login, signup } from '@/app/[locale]/login/actions'
import { OAuthButtons } from '@/components/auth/oauth-buttons'
import { Separator } from '@/components/ui/separator'
import { useSearchParams } from 'next/navigation'

export function LoginForm() {
    const searchParams = useSearchParams();
    const message = searchParams.get('message');
    const error = searchParams.get('error');

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle className="text-2xl font-bold text-center">
                    Welcome back
                </CardTitle>
                <CardDescription className="text-center">
                    Login to your account
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <OAuthButtons />

                <div className="flex items-center gap-4">
                    <Separator className="flex-1" />
                    <span className="text-xs text-muted-foreground">OR</span>
                    <Separator className="flex-1" />
                </div>

                <form className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="m@example.com"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" name="password" type="password" required />
                    </div>

                    {error && (
                        <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="p-3 text-sm text-blue-500 bg-blue-50 border border-blue-200 rounded-md">
                            {message}
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <Button formAction={login} className="w-full">
                            Log in
                        </Button>
                        <Button
                            formAction={signup}
                            variant="ghost"
                            className="w-full"
                        >
                            Sign up
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
