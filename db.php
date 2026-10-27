<?php
// db.php
$host = "localhost";
$user = "root";
$pass = ""; // default XAMPP biasanya kosong
$dbname = "mantis_db";

$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
    die(json_encode([
        "status" => "error",
        "message" => "Koneksi Database Gagal: " . $conn->connect_error
    ]));
}
// Set charset UTF-8
$conn->set_charset("utf8mb4");
?>