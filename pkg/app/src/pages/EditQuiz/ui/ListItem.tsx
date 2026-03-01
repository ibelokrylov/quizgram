import { NavigationMenuLink } from '@/components/ui/navigation-menu';

function ListItem({ title, children, ...props }: React.ComponentPropsWithoutRef<'li'>) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <div className="flex flex-col gap-1 text-sm">
          <div className="leading-none font-medium">{title}</div>
          <div className="text-muted-foreground line-clamp-2">{children}</div>
        </div>
      </NavigationMenuLink>
    </li>
  );
}

export default ListItem;
