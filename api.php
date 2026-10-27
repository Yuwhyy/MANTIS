<?php
// api.php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");

require_once "db.php";

$action = isset($_GET['action']) ? $_GET['action'] : '';

// -------------------------------------------------------------
// 1. GET ALL DATA (Ambil Seluruh Data Proyek, Users, Bids)
// -------------------------------------------------------------
if ($action === 'get_all_data') {
    // Ambil Projects
    $projectsRes = $conn->query("SELECT p.*, u.nama_lengkap AS client_name FROM projects p JOIN users u ON p.client_id = u.id ORDER BY p.id DESC");
    $projects = [];
    while ($row = $projectsRes->fetch_assoc()) {
        $projects[] = [
            "id" => (int)$row['id'],
            "clientId" => (int)$row['client_id'],
            "client" => $row['client_name'],
            "title" => $row['judul'],
            "category" => $row['kategori'],
            "deadline" => $row['deadline'],
            "budgetMin" => (int)$row['budget_min'],
            "budgetMax" => (int)$row['budget_max'],
            "description" => $row['deskripsi'],
            "status" => $row['status_proyek']
        ];
    }

    // Ambil Users
    $usersRes = $conn->query("SELECT id, nama_lengkap, email, peran FROM users ORDER BY id ASC");
    $users = [];
    while ($row = $usersRes->fetch_assoc()) {
        $users[] = [
            "id" => (int)$row['id'],
            "name" => $row['nama_lengkap'],
            "email" => $row['email'],
            "role" => $row['peran']
        ];
    }

    // Ambil Bids
    $bidsRes = $conn->query("SELECT b.*, u.nama_lengkap AS freelancer_name FROM bids b JOIN users u ON b.freelancer_id = u.id ORDER BY b.id DESC");
    $bids = [];
    while ($row = $bidsRes->fetch_assoc()) {
        $bids[] = [
            "id" => (int)$row['id'],
            "projectId" => (int)$row['project_id'],
            "freelancerId" => (int)$row['freelancer_id'],
            "freelancerName" => $row['freelancer_name'],
            "price" => (int)$row['harga_tawaran'],
            "proposal" => $row['proposal']
        ];
    }

    echo json_encode([
        "status" => "success",
        "projects" => $projects,
        "users" => $users,
        "bids" => $bids
    ]);
    exit();
}

// Baca Payload POST JSON
$input = json_decode(file_get_contents('php://input'), true);

// -------------------------------------------------------------
// 2. REGISTER USER BARU
// -------------------------------------------------------------
if ($action === 'register') {
    $name = $input['name'];
    $email = $input['email'];
    $password = password_hash($input['password'], PASSWORD_DEFAULT);
    $role = $input['role'];

    // Cek Email
    $checkStmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $checkStmt->bind_param("s", $email);
    $checkStmt->execute();
    if ($checkStmt->get_result()->num_rows > 0) {
        echo json_encode(["status" => "error", "message" => "Email sudah terdaftar!"]);
        exit();
    }

    $stmt = $conn->prepare("INSERT INTO users (nama_lengkap, email, password_hash, peran) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssss", $name, $email, $password, $role);

    if ($stmt->execute()) {
        $newId = $stmt->insert_id;
        echo json_encode([
            "status" => "success",
            "message" => "Registrasi berhasil!",
            "user" => ["id" => $newId, "name" => $name, "email" => $email, "role" => $role]
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Gagal meregistrasi user."]);
    }
    exit();
}

// -------------------------------------------------------------
// 3. LOGIN USER
// -------------------------------------------------------------
if ($action === 'login') {
    $role = $input['role'];
    $email = $input['email'];
    $password = $input['password'];

    $stmt = $conn->prepare("SELECT * FROM users WHERE email = ? AND peran = ?");
    $stmt->bind_param("ss", $email, $role);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($user = $result->fetch_assoc()) {
        if (password_verify($password, $user['password_hash']) || $password === $user['password_hash']) {
            echo json_encode([
                "status" => "success",
                "message" => "Login berhasil!",
                "user" => [
                    "id" => (int)$user['id'],
                    "name" => $user['nama_lengkap'],
                    "email" => $user['email'],
                    "role" => $user['peran']
                ]
            ]);
            exit();
        }
    }

    echo json_encode(["status" => "error", "message" => "Email, Password, atau Peran tidak cocok!"]);
    exit();
}

// -------------------------------------------------------------
// 4. POSTING PROYEK BARU
// -------------------------------------------------------------
if ($action === 'create_project') {
    $clientId = $input['clientId'];
    $title = $input['title'];
    $category = $input['category'];
    $deadline = $input['deadline'];
    $budgetMin = $input['budgetMin'];
    $budgetMax = $input['budgetMax'];
    $description = $input['description'];

    $stmt = $conn->prepare("INSERT INTO projects (client_id, judul, kategori, deskripsi, budget_min, budget_max, deadline) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("isssiis", $clientId, $title, $category, $description, $budgetMin, $budgetMax, $deadline);

    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Proyek berhasil disimpan di MySQL!"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Gagal menyimpan proyek: " . $conn->error]);
    }
    exit();
}

// -------------------------------------------------------------
// 5. POSTING PENAWARAN (BID)
// -------------------------------------------------------------
if ($action === 'create_bid') {
    $projectId = $input['projectId'];
    $freelancerId = $input['freelancerId'];
    $price = $input['price'];
    $proposal = $input['proposal'];
    $estimasi = "3 Hari"; // Default estimasi

    $stmt = $conn->prepare("INSERT INTO bids (project_id, freelancer_id, harga_tawaran, estimasi_hari, proposal) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("iiiss", $projectId, $freelancerId, $price, $estimasi, $proposal);

    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Penawaran berhasil disimpan di MySQL!"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Gagal menyimpan penawaran."]);
    }
    exit();
}

// -------------------------------------------------------------
// 6. HAPUS PROYEK ATAU USER
// -------------------------------------------------------------
if ($action === 'delete_project') {
    $id = $input['id'];
    $conn->query("DELETE FROM projects WHERE id = $id");
    echo json_encode(["status" => "success"]);
    exit();
}

if ($action === 'delete_user') {
    $id = $input['id'];
    $conn->query("DELETE FROM users WHERE id = $id");
    echo json_encode(["status" => "success"]);
    exit();
}

// -------------------------------------------------------------
// 7. KLIEN MEMILIH FREELANCER (ACCEPT BID)
// -------------------------------------------------------------
if ($action === 'accept_bid') {
    $projectId = $input['projectId'];
    $freelancerName = $input['freelancerName'];
    
    // Ubah status proyek menjadi dikerjakan oleh freelancer terpilih
    $newStatus = "Dikerjakan: " . $freelancerName;
    
    $stmt = $conn->prepare("UPDATE projects SET status_proyek = ? WHERE id = ?");
    $stmt->bind_param("si", $newStatus, $projectId);
    
    if ($stmt->execute()) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Gagal menyetujui penawaran."]);
    }
    exit();
}

// -------------------------------------------------------------
// 8. KLIEN MENYELESAIKAN PROYEK
// -------------------------------------------------------------
if ($action === 'complete_project') {
    $projectId = $input['projectId'];
    $newStatus = "Selesai";
    
    $stmt = $conn->prepare("UPDATE projects SET status_proyek = ? WHERE id = ?");
    $stmt->bind_param("si", $newStatus, $projectId);
    
    if ($stmt->execute()) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Gagal menyelesaikan proyek."]);
    }
    exit();
}

// -------------------------------------------------------------
// 9. KLIEN MEMBATALKAN FREELANCER (KEMBALI KE BUKA PENAWARAN)
// -------------------------------------------------------------
if ($action === 'cancel_freelancer') {
    $projectId = $input['projectId'];
    $newStatus = "Buka penawaran";
    
    $stmt = $conn->prepare("UPDATE projects SET status_proyek = ? WHERE id = ?");
    $stmt->bind_param("si", $newStatus, $projectId);
    
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Freelancer berhasil dibatalkan. Proyek kembali membuka penawaran."]);
    } else {
        echo json_encode(["status" => "error", "message" => "Gagal membatalkan freelancer."]);
    }
    exit();
}

?>