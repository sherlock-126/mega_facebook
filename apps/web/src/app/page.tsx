import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@mega/ui';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold">Mega Facebook</h1>
      <p className="text-muted-foreground">Component Showcase</p>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Button Variants</CardTitle>
          <CardDescription>All available button styles</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </CardContent>
      </Card>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Input</CardTitle>
          <CardDescription>Text input component</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input type="email" placeholder="Email" />
          <Input type="password" placeholder="Password" />
        </CardContent>
        <CardFooter>
          <Button className="w-full">Sign In</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
