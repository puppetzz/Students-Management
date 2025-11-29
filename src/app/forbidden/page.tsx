"use client";

import { Button, Center, Container, Text, Title } from "@mantine/core";
import { IconLock } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

export default function ForbiddenPage() {
  const router = useRouter();

  return (
    <Container size="md">
      <Center style={{ minHeight: "100vh", flexDirection: "column" }}>
        <IconLock size={120} color="red" style={{ marginBottom: "2rem" }} />
        <Title order={1} style={{ marginBottom: "1rem" }}>
          403 - Truy Cập Bị Từ Chối
        </Title>
        <Text size="lg" c="dimmed" ta="center" style={{ marginBottom: "2rem" }}>
          Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị viên
          nếu bạn cho rằng đây là lỗi.
        </Text>
        <Button size="lg" onClick={() => router.push("/")}>
          Quay Về Trang Chủ
        </Button>
      </Center>
    </Container>
  );
}
