import { Flex, Box, Container, Card, Grid, Heading, Link, Blockquote, Code, Table, Separator } from "@radix-ui/themes";
import { getSessionUser } from "@/utils/sessionUser";
import Markdown, { ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import fs from "fs/promises";
import path from "path";

export default async function Page() {
  return (
    <main>
      <Flex direction="column" gap="4" py="7">
        <TopCard />
      </Flex>
    </main>
  );
}

async function TopCard() {
  const sessionUser = await getSessionUser();
  const markdown = await readPublicFile("landingPageInfo.md");
  return (
    <Container size="3" px="8">
      <Flex direction="column" gap="4">
        <Card>
          <Flex direction="column" gap="4">
            <Grid columns="2" gap="2">
              <Heading as="h2">Hi {sessionUser.name} !</Heading>
            </Grid>
            <Box>
              <Flex direction="column" gap="2">
                <Heading size="3">Page Link</Heading>
                <Flex direction="column" gap="0">
                  <Link href="/user">User</Link>
                  <Link href="/group">Group</Link>
                  <Link href="/catalog">Catalog</Link>
                </Flex>
              </Flex>
            </Box>
          </Flex>
        </Card>
        <MarkdownView markdown={markdown} />
      </Flex>
    </Container>
  );
}

type HeadingSize = "1" | "2" | "3" | "4" | "5" | "6";
const markdownHeading = (size: HeadingSize, props: JSX.IntrinsicElements["h1"] & ExtraProps) => {
  return (
    <Heading size={size} my="16px">
      {props.children}
    </Heading>
  );
};

function MarkdownView({ markdown }: { markdown: string | undefined }) {
  if (markdown === undefined || markdown.trim() === "") {
    return <></>;
  }

  const commonStyles = {
    listStyleType: "decimal",
    paddingLeft: "20px",
  };

  return (
    <Card>
      <div style={{ lineHeight: "1.6" }}>
        <Markdown
          skipHtml={true} // Skip HTML tags to hide HTML comments included in the markdown.
          components={{
            a: ({ node, ...props }) => {
              const filteredProps = { href: props.href as string };
              return <Link {...filteredProps}>{props.children}</Link>;
            },
            h1: (props) => markdownHeading("6", props),
            h2: (props) => markdownHeading("5", props),
            h3: (props) => markdownHeading("4", props),
            h4: (props) => markdownHeading("3", props),
            h5: (props) => markdownHeading("2", props),
            h6: (props) => markdownHeading("1", props),
            blockquote: ({ node, ...props }) => <Blockquote>{props.children}</Blockquote>,
            ol: ({ node, ...props }) => <ol style={commonStyles}>{props.children}</ol>,
            ul: ({ node, ...props }) => <ul style={{ ...commonStyles, listStyleType: "disc" }}>{props.children}</ul>,
            table: ({ node, ...props }) => <Table.Root>{props.children}</Table.Root>,
            thead: ({ node, ...props }) => <Table.Header>{props.children}</Table.Header>,
            tbody: ({ node, ...props }) => <Table.Body>{props.children}</Table.Body>,
            th: ({ node, ...props }) => <Table.ColumnHeaderCell>{props.children}</Table.ColumnHeaderCell>,
            td: ({ node, ...props }) => <Table.Cell>{props.children}</Table.Cell>,
            tr: ({ node, ...props }) => <Table.Row>{props.children}</Table.Row>,
            code: ({ node, ...props }) => <Code>{props.children}</Code>,
            hr: () => <Separator orientation="horizontal" size="4" mt="10px" />,
          }}
          remarkPlugins={[remarkGfm]}
        >
          {markdown}
        </Markdown>
      </div>
    </Card>
  );
}

async function readPublicFile(fileName: string): Promise<string | undefined> {
  const filePath = path.join(process.cwd(), "content", fileName);
  try {
    await fs.access(filePath);
    const data = await fs.readFile(filePath, "utf8");
    return data;
  } catch (err) {
    return undefined;
  }
}
