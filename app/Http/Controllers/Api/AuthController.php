<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * Iniciar sesión (Marvin o Melany) con sesión de 4 horas.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $email = trim(strtolower($request->email));
        $user = User::where('email', $email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Credenciales incorrectas. Verifique su correo o contraseña.',
            ], 401);
        }

        // Generar token de sesión con 4 horas de validez (240 minutos)
        $expiresAt = Carbon::now()->addHours(4)->toIso8601String();
        $token = Str::random(64);

        $user->remember_token = $token;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => "¡Bienvenido/a {$user->name}!",
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'token' => $token,
            'expires_at' => $expiresAt,
            'lifetime_minutes' => 240,
        ]);
    }

    /**
     * Verificar sesión activa.
     */
    public function me(Request $request): JsonResponse
    {
        $token = $request->bearerToken() ?: $request->header('X-Auth-Token');

        if (!$token) {
            return response()->json(['authenticated' => false], 401);
        }

        $user = User::where('remember_token', $token)->first();

        if (!$user) {
            return response()->json(['authenticated' => false], 401);
        }

        return response()->json([
            'authenticated' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }

    /**
     * Cerrar sesión.
     */
    public function logout(Request $request): JsonResponse
    {
        $token = $request->bearerToken() ?: $request->header('X-Auth-Token');

        if ($token) {
            User::where('remember_token', $token)->update(['remember_token' => null]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Sesión cerrada correctamente.',
        ]);
    }
}
