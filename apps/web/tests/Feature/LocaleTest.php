<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LocaleTest extends TestCase
{
    use RefreshDatabase;

    public function test_rendered_document_direction_follows_the_selected_locale(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withSession(['locale' => 'en'])
            ->get('/dashboard')
            ->assertSee('<html lang="en" dir="ltr">', false);

        $this->actingAs($user)
            ->withSession(['locale' => 'ar'])
            ->get('/dashboard')
            ->assertSee('<html lang="ar" dir="rtl">', false);
    }

    public function test_locale_switch_persists_in_the_session(): void
    {
        $this->post('/locale', ['locale' => 'ar'])
            ->assertRedirect();

        $this->get('/login')
            ->assertSee('<html lang="ar" dir="rtl">', false);
    }
}
