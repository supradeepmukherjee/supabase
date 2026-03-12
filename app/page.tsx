import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col h-screen items-center justify-center">
      <form action="/auth/logout" method="post">
        <Button>
          Logout
        </Button>
      </form>
    </div>
  );
}
