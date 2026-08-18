<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_login_marvin_exitoso(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'marvin@gmail.com',
            'password' => '210701',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'user' => [
                    'name' => 'Marvin',
                    'email' => 'marvin@gmail.com',
                ],
            ]);

        $this->assertNotEmpty($response->json('token'));
        $this->assertNotEmpty($response->json('expires_at'));
    }

    public function test_login_melany_exitoso(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'melany@gmail.com',
            'password' => '123456',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'user' => [
                    'name' => 'Melany',
                    'email' => 'melany@gmail.com',
                ],
            ]);
    }

    public function test_login_credenciales_invalidas(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'marvin@gmail.com',
            'password' => 'wrongpass',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
            ]);
    }
}
