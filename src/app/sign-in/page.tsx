"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Container,
  Box,
  Stack,
} from "@mantine/core";
import { IconLock, IconMail, IconSchool } from "@tabler/icons-react";
import { toast } from "react-toastify";
import { api } from "~/trpc/react";

export default function SignIn() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    console.log("username:", username);
    console.log("password:", password);
    console.log("isLoading:", "aaaa");

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Email hoặc mật khẩu không đúng. Vui lòng thử lại.");
      } else if (result?.ok) {
        toast.success("Đăng nhập thành công!");
        window.location.href = "/";
      }
    } catch (_) {
      toast.error("Đã xảy ra lỗi. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: "100vh",
        backgroundImage: "url(/bg_1.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        position: "relative",
      }}
    >
      <Box
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(2px)",
        }}
      />
      <Container size={460} my={40} style={{ position: "relative", zIndex: 1 }}>
        <Box style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Box
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(10px)",
              marginBottom: "1rem",
            }}
          >
            <IconSchool size={40} color="white" />
          </Box>
          <Title
            order={1}
            style={{
              color: "white",
              fontSize: "2rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
            }}
          >
            Quản Lý Học Viên
          </Title>
          <Text
            size="lg"
            style={{
              color: "rgba(255, 255, 255, 0.9)",
              fontWeight: 400,
            }}
          >
            Hệ thống quản trị viên
          </Text>
        </Box>

        <Paper
          withBorder
          shadow="xl"
          p={40}
          radius="md"
          style={{
            background: "white",
          }}
        >
          <Title
            order={2}
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              marginBottom: "0.5rem",
              textAlign: "center",
            }}
          >
            Đăng Nhập
          </Title>
          <Text
            c="dimmed"
            size="sm"
            style={{ textAlign: "center", marginBottom: "1.5rem" }}
          >
            Vui lòng đăng nhập để tiếp tục
          </Text>

          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                required
                label="Tên đăng nhập"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.currentTarget.value)}
                leftSection={<IconMail size={16} />}
                size="md"
                disabled={isLoading}
              />

              <PasswordInput
                required
                label="Mật khẩu"
                placeholder="Nhập mật khẩu của bạn"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                leftSection={<IconLock size={16} />}
                size="md"
                disabled={isLoading}
              />

              <Button
                type="submit"
                fullWidth
                size="md"
                loading={isLoading}
                style={{
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  marginTop: "0.5rem",
                }}
              >
                Đăng nhập
              </Button>
            </Stack>
          </form>
        </Paper>

        <Text
          c="white"
          size="sm"
          style={{ textAlign: "center", marginTop: "1.5rem" }}
        >
          © 2025 Quản Lý Học Viên. All rights reserved.
        </Text>
      </Container>
    </Box>
  );
}
