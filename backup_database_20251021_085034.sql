-- MariaDB dump 10.19  Distrib 10.4.27-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: lophoc_online
-- ------------------------------------------------------
-- Server version	8.0.30

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` int NOT NULL,
  `changes` text COLLATE utf8mb4_unicode_ci,
  `ip_address` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,1,'payment_created','payment',1,'{\"before\":\"pending\",\"after\":\"completed\"}','192.168.1.100',NULL,'2025-10-20 13:59:55'),(2,NULL,'escrow_released','escrow',2,'{\"before\":\"pending\",\"after\":\"completed\"}','192.168.1.101',NULL,'2025-10-20 13:59:55'),(3,NULL,'payout_approved','payout',3,'{\"before\":\"pending\",\"after\":\"completed\"}','192.168.1.102',NULL,'2025-10-20 13:59:55'),(4,1,'tutor_verified','tutor',4,'{\"before\":\"pending\",\"after\":\"completed\"}','192.168.1.103',NULL,'2025-10-20 13:59:55'),(5,NULL,'enrollment_created','enrollment',5,'{\"before\":\"pending\",\"after\":\"completed\"}','192.168.1.104',NULL,'2025-10-20 13:59:55'),(6,NULL,'payment_created','payment',6,'{\"before\":\"pending\",\"after\":\"completed\"}','192.168.1.105',NULL,'2025-10-20 13:59:55'),(7,1,'escrow_released','escrow',7,'{\"before\":\"pending\",\"after\":\"completed\"}','192.168.1.106',NULL,'2025-10-20 13:59:55'),(8,NULL,'payout_approved','payout',8,'{\"before\":\"pending\",\"after\":\"completed\"}','192.168.1.107',NULL,'2025-10-20 13:59:55'),(9,NULL,'tutor_verified','tutor',9,'{\"before\":\"pending\",\"after\":\"completed\"}','192.168.1.108',NULL,'2025-10-20 13:59:55'),(10,1,'enrollment_created','enrollment',10,'{\"before\":\"pending\",\"after\":\"completed\"}','192.168.1.109',NULL,'2025-10-20 13:59:55'),(11,NULL,'payment_created','payment',11,'{\"before\":\"pending\",\"after\":\"completed\"}','192.168.1.110',NULL,'2025-10-20 13:59:55'),(12,NULL,'escrow_released','escrow',12,'{\"before\":\"pending\",\"after\":\"completed\"}','192.168.1.111',NULL,'2025-10-20 13:59:55'),(13,1,'payout_approved','payout',13,'{\"before\":\"pending\",\"after\":\"completed\"}','192.168.1.112',NULL,'2025-10-20 13:59:55'),(14,NULL,'tutor_verified','tutor',14,'{\"before\":\"pending\",\"after\":\"completed\"}','192.168.1.113',NULL,'2025-10-20 13:59:55'),(15,NULL,'enrollment_created','enrollment',15,'{\"before\":\"pending\",\"after\":\"completed\"}','192.168.1.114',NULL,'2025-10-20 13:59:55');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `class_enrollments`
--

DROP TABLE IF EXISTS `class_enrollments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `class_enrollments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `tutor_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `grade_level_id` int NOT NULL,
  `total_sessions` int NOT NULL,
  `completed_sessions` int NOT NULL DEFAULT '0',
  `price_per_session` int NOT NULL,
  `total_amount` int NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `start_date` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `end_date` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `schedule` text COLLATE utf8mb4_unicode_ci,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `class_enrollments`
--

LOCK TABLES `class_enrollments` WRITE;
/*!40000 ALTER TABLE `class_enrollments` DISABLE KEYS */;
INSERT INTO `class_enrollments` VALUES (1,1,1,1,1,8,0,400000,3200000,'active','2025-10-20','2025-11-20','[{\"day\":2,\"time\":\"18:00-20:00\"},{\"day\":5,\"time\":\"18:00-20:00\"}]',NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(2,2,2,2,2,8,2,400000,3200000,'active','2025-10-27','2025-11-27','[{\"day\":2,\"time\":\"18:00-20:00\"},{\"day\":5,\"time\":\"18:00-20:00\"}]',NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(3,3,3,3,3,8,4,400000,3200000,'active','2025-11-03','2025-12-03','[{\"day\":2,\"time\":\"18:00-20:00\"},{\"day\":5,\"time\":\"18:00-20:00\"}]',NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(4,4,4,4,4,8,6,400000,3200000,'active','2025-11-10','2025-12-10','[{\"day\":2,\"time\":\"18:00-20:00\"},{\"day\":5,\"time\":\"18:00-20:00\"}]',NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(5,5,5,5,5,8,0,400000,3200000,'pending','2025-11-17','2025-12-17','[{\"day\":2,\"time\":\"18:00-20:00\"},{\"day\":5,\"time\":\"18:00-20:00\"}]',NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(6,6,6,6,6,8,0,400000,3200000,'pending','2025-11-24','2025-12-24','[{\"day\":2,\"time\":\"18:00-20:00\"},{\"day\":5,\"time\":\"18:00-20:00\"}]',NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(7,7,7,7,7,8,0,400000,3200000,'pending','2025-12-01','2026-01-01','[{\"day\":2,\"time\":\"18:00-20:00\"},{\"day\":5,\"time\":\"18:00-20:00\"}]',NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(8,8,8,8,1,8,0,400000,3200000,'pending','2025-12-08','2026-01-08','[{\"day\":2,\"time\":\"18:00-20:00\"},{\"day\":5,\"time\":\"18:00-20:00\"}]',NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55');
/*!40000 ALTER TABLE `class_enrollments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `escrow_payments`
--

DROP TABLE IF EXISTS `escrow_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `escrow_payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `payment_id` int NOT NULL,
  `enrollment_id` int NOT NULL,
  `total_amount` int NOT NULL,
  `released_amount` int NOT NULL DEFAULT '0',
  `platform_fee` int NOT NULL DEFAULT '0',
  `commission_rate` int NOT NULL DEFAULT '15',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'holding',
  `last_release_date` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `escrow_payments_payment_id_unique` (`payment_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `escrow_payments`
--

LOCK TABLES `escrow_payments` WRITE;
/*!40000 ALTER TABLE `escrow_payments` DISABLE KEYS */;
INSERT INTO `escrow_payments` VALUES (1,1,1,3200000,0,0,15,'in_progress',NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(2,2,2,3200000,400000,60000,15,'in_progress',NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(3,3,3,3200000,800000,120000,15,'in_progress',NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(4,4,4,3200000,1200000,180000,15,'in_progress',NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55');
/*!40000 ALTER TABLE `escrow_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `favorite_tutors`
--

DROP TABLE IF EXISTS `favorite_tutors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `favorite_tutors` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `tutor_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `favorite_tutors`
--

LOCK TABLES `favorite_tutors` WRITE;
/*!40000 ALTER TABLE `favorite_tutors` DISABLE KEYS */;
INSERT INTO `favorite_tutors` VALUES (1,1,1,'2025-10-20 13:59:55'),(2,1,2,'2025-10-20 13:59:55'),(3,2,2,'2025-10-20 13:59:55'),(4,2,3,'2025-10-20 13:59:55'),(5,2,4,'2025-10-20 13:59:55'),(6,3,3,'2025-10-20 13:59:55'),(7,3,4,'2025-10-20 13:59:55'),(8,4,4,'2025-10-20 13:59:55'),(9,4,5,'2025-10-20 13:59:55'),(10,4,6,'2025-10-20 13:59:55'),(11,5,5,'2025-10-20 13:59:55'),(12,5,6,'2025-10-20 13:59:55'),(13,6,6,'2025-10-20 13:59:55'),(14,6,7,'2025-10-20 13:59:55'),(15,6,8,'2025-10-20 13:59:55');
/*!40000 ALTER TABLE `favorite_tutors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `grade_levels`
--

DROP TABLE IF EXISTS `grade_levels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `grade_levels` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` int NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `grade_levels_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=111 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `grade_levels`
--

LOCK TABLES `grade_levels` WRITE;
/*!40000 ALTER TABLE `grade_levels` DISABLE KEYS */;
INSERT INTO `grade_levels` VALUES (91,'Lớp 1',1,1,'2025-10-21 01:47:18','Tiểu học'),(92,'Lớp 2',2,1,'2025-10-21 01:47:18','Tiểu học'),(93,'Lớp 3',3,1,'2025-10-21 01:47:18','Tiểu học'),(94,'Lớp 4',4,1,'2025-10-21 01:47:18','Tiểu học'),(95,'Lớp 5',5,1,'2025-10-21 01:47:18','Tiểu học'),(96,'Lớp 6',6,1,'2025-10-21 01:47:18','THCS'),(97,'Lớp 7',7,1,'2025-10-21 01:47:18','THCS'),(98,'Lớp 8',8,1,'2025-10-21 01:47:18','THCS'),(99,'Lớp 9',9,1,'2025-10-21 01:47:18','THCS'),(100,'Lớp 10',10,1,'2025-10-21 01:47:18','THPT'),(101,'Lớp 11',11,1,'2025-10-21 01:47:18','THPT'),(102,'Lớp 12',12,1,'2025-10-21 01:47:18','THPT'),(103,'Luyện thi THPT Quốc gia',13,1,'2025-10-21 01:47:18','Luyện thi'),(104,'Luyện thi Đại học',14,1,'2025-10-21 01:47:18','Luyện thi'),(105,'Luyện thi IELTS',15,1,'2025-10-21 01:47:18','Luyện thi'),(106,'Luyện thi TOEFL',16,1,'2025-10-21 01:47:18','Luyện thi'),(107,'Luyện thi SAT',17,1,'2025-10-21 01:47:18','Luyện thi'),(108,'Người đi làm',18,1,'2025-10-21 01:47:18','Khác'),(109,'Đại học',19,1,'2025-10-21 01:47:18','Khác'),(110,'Khác',20,1,'2025-10-21 01:47:18','Khác');
/*!40000 ALTER TABLE `grade_levels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lessons`
--

DROP TABLE IF EXISTS `lessons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lessons` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tutor_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_time` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `end_time` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `price` int NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `tutor_confirmed` int NOT NULL DEFAULT '0',
  `student_confirmed` int NOT NULL DEFAULT '0',
  `completed_at` timestamp NULL DEFAULT NULL,
  `cancelled_by` int DEFAULT NULL,
  `cancellation_reason` text COLLATE utf8mb4_unicode_ci,
  `meeting_link` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_trial` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lessons`
--

LOCK TABLES `lessons` WRITE;
/*!40000 ALTER TABLE `lessons` DISABLE KEYS */;
/*!40000 ALTER TABLE `lessons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `link` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_read` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (27,2,'confirmation','Lịch học đã được xác nhận','Gia sư GS. Nguyễn Văn Minh đã xác nhận lịch học Toán vào ngày mai lúc 18:00','/student/my-lessons',0,'2025-10-20 14:03:29'),(28,3,'reminder','Nhắc nhở buổi học','Bạn có buổi học Lý với TS. Trần Thị Hoa vào 19:00 hôm nay','/student/my-lessons',0,'2025-10-20 14:03:29'),(29,4,'payment','Thanh toán thành công','Thanh toán 500.000đ cho buổi học Hóa đã thành công','/student/financial',1,'2025-10-20 14:03:29'),(30,5,'review_request','Đánh giá buổi học','Hãy đánh giá buổi học với Phạm Thị Lan để giúp cải thiện chất lượng','/student/my-lessons',0,'2025-10-20 14:03:29'),(31,7,'booking','Yêu cầu đặt lịch mới','Học sinh Nguyễn Văn A muốn đặt lịch học Toán','/tutor/pending-lessons',0,'2025-10-20 14:03:29'),(32,8,'booking','Yêu cầu đặt lịch mới','Học sinh Lê Văn C muốn đặt lịch học Lý','/tutor/pending-lessons',0,'2025-10-20 14:03:29'),(33,9,'review_received','Đánh giá mới','Học sinh Lê Văn C đã đánh giá 4.8★ cho buổi học Hóa','/tutor/reputation',1,'2025-10-20 14:03:29'),(34,10,'payment','Đã nhận thanh toán','Bạn đã nhận 440.000đ từ buổi học với Phạm Thị D','/tutor/financial',1,'2025-10-20 14:03:29');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `enrollment_id` int NOT NULL,
  `student_id` int NOT NULL,
  `amount` int NOT NULL,
  `method` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gateway` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `transaction_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway_transaction_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway_response` text COLLATE utf8mb4_unicode_ci,
  `signature` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `signature_verified` int NOT NULL DEFAULT '0',
  `ip_address` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `refunded_at` timestamp NULL DEFAULT NULL,
  `refund_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `payments_transaction_code_unique` (`transaction_code`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (1,1,1,3200000,'vnpay','vnpay','completed','PAY17609687950040','GW17609687950040',NULL,NULL,1,NULL,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(2,2,2,3200000,'momo','momo','completed','PAY17609687950041','GW17609687950041',NULL,NULL,1,NULL,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(3,3,3,3200000,'vnpay','vnpay','completed','PAY17609687950052','GW17609687950052',NULL,NULL,1,NULL,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(4,4,4,3200000,'momo','momo','completed','PAY17609687950053','GW17609687950053',NULL,NULL,1,NULL,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(5,5,5,3200000,'vnpay','vnpay','pending','PAY17609687950054','GW17609687950054',NULL,NULL,0,NULL,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(6,6,6,3200000,'momo','momo','pending','PAY17609687950055','GW17609687950055',NULL,NULL,0,NULL,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(7,7,7,3200000,'vnpay','vnpay','pending','PAY17609687950056','GW17609687950056',NULL,NULL,0,NULL,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(8,8,8,3200000,'momo','momo','pending','PAY17609687950057','GW17609687950057',NULL,NULL,0,NULL,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55');
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payout_requests`
--

DROP TABLE IF EXISTS `payout_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payout_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tutor_id` int NOT NULL,
  `wallet_id` int NOT NULL,
  `amount` int NOT NULL,
  `bank_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bank_account` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bank_account_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `request_note` text COLLATE utf8mb4_unicode_ci,
  `admin_note` text COLLATE utf8mb4_unicode_ci,
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `rejected_reason` text COLLATE utf8mb4_unicode_ci,
  `transaction_proof` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payout_requests`
--

LOCK TABLES `payout_requests` WRITE;
/*!40000 ALTER TABLE `payout_requests` DISABLE KEYS */;
INSERT INTO `payout_requests` VALUES (1,1,2,500000,'Vietcombank','12345678900','Gia Sư 1','pending','Yêu cầu rút tiền lần 1',NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(2,2,3,600000,'Techcombank','12345678901','Gia Sư 2','approved','Yêu cầu rút tiền lần 2',NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(3,3,4,700000,'VietinBank','12345678902','Gia Sư 3','completed','Yêu cầu rút tiền lần 3',NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(4,4,5,800000,'BIDV','12345678903','Gia Sư 4','pending','Yêu cầu rút tiền lần 4',NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(5,5,6,900000,'MB Bank','12345678904','Gia Sư 5','approved','Yêu cầu rút tiền lần 5',NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55');
/*!40000 ALTER TABLE `payout_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reviews` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `lesson_id` int NOT NULL,
  `tutor_id` int NOT NULL,
  `student_id` int NOT NULL,
  `rating` int NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci,
  `reply` text COLLATE utf8mb4_unicode_ci,
  `replied_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
INSERT INTO `reviews` VALUES (27,1,1,1,50,'Thầy dạy rất hay, giải thích dễ hiểu. Em đã nắm vững kiến thức Toán học hơn rất nhiều!',NULL,NULL,'2025-10-20 14:03:29','2025-10-20 14:03:29'),(28,2,1,2,48,'Thầy nhiệt tình, tận tâm. Phương pháp giảng dạy hiệu quả.',NULL,NULL,'2025-10-20 14:03:29','2025-10-20 14:03:29'),(29,3,2,2,50,'Cô dạy Lý rất tốt, em đã hiểu được nhiều bài khó. Cảm ơn cô!',NULL,NULL,'2025-10-20 14:03:29','2025-10-20 14:03:29'),(30,4,2,3,46,'Cô giảng bài chi tiết, dễ hiểu. Tuy nhiên có lúc hơi nhanh.',NULL,NULL,'2025-10-20 14:03:29','2025-10-20 14:03:29'),(31,5,3,3,48,'Thầy dạy Hóa rất tốt, bài giảng logic và dễ nhớ.',NULL,NULL,'2025-10-20 14:03:29','2025-10-20 14:03:29'),(32,6,4,4,50,'Cô dạy Tiếng Anh xuất sắc! Em đã cải thiện điểm số rất nhiều.',NULL,NULL,'2025-10-20 14:03:29','2025-10-20 14:03:29'),(33,7,4,5,48,'Cô nhiệt tình, phát âm chuẩn. Rất hài lòng!',NULL,NULL,'2025-10-20 14:03:29','2025-10-20 14:03:29'),(34,8,5,5,46,'Thầy dạy Văn hay, phân tích tác phẩm sâu sắc.',NULL,NULL,'2025-10-20 14:03:29','2025-10-20 14:03:29');
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `session_records`
--

DROP TABLE IF EXISTS `session_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `session_records` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `enrollment_id` int NOT NULL,
  `lesson_id` int DEFAULT NULL,
  `session_number` int NOT NULL,
  `date` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_time` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `end_time` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'scheduled',
  `tutor_attended` int NOT NULL DEFAULT '0',
  `student_attended` int NOT NULL DEFAULT '0',
  `tutor_notes` text COLLATE utf8mb4_unicode_ci,
  `completed_at` timestamp NULL DEFAULT NULL,
  `released_amount` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `session_records`
--

LOCK TABLES `session_records` WRITE;
/*!40000 ALTER TABLE `session_records` DISABLE KEYS */;
INSERT INTO `session_records` VALUES (1,1,NULL,1,'2025-10-11','18:00','20:00','completed',1,1,NULL,NULL,400000,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(2,1,NULL,2,'2025-10-14','18:00','20:00','completed',1,1,NULL,NULL,400000,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(3,1,NULL,3,'2025-10-17','18:00','20:00','scheduled',0,0,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(4,1,NULL,4,'2025-10-20','18:00','20:00','scheduled',0,0,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(5,2,NULL,1,'2025-10-05','18:00','20:00','completed',1,1,NULL,NULL,400000,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(6,2,NULL,2,'2025-10-08','18:00','20:00','completed',1,1,NULL,NULL,400000,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(7,2,NULL,3,'2025-10-11','18:00','20:00','completed',1,1,NULL,NULL,400000,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(8,2,NULL,4,'2025-10-14','18:00','20:00','scheduled',0,0,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(9,2,NULL,5,'2025-10-17','18:00','20:00','scheduled',0,0,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(10,2,NULL,6,'2025-10-20','18:00','20:00','scheduled',0,0,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(11,3,NULL,1,'2025-09-29','18:00','20:00','completed',1,1,NULL,NULL,400000,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(12,3,NULL,2,'2025-10-02','18:00','20:00','completed',1,1,NULL,NULL,400000,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(13,3,NULL,3,'2025-10-05','18:00','20:00','completed',1,1,NULL,NULL,400000,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(14,3,NULL,4,'2025-10-08','18:00','20:00','completed',1,1,NULL,NULL,400000,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(15,3,NULL,5,'2025-10-11','18:00','20:00','scheduled',0,0,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(16,3,NULL,6,'2025-10-14','18:00','20:00','scheduled',0,0,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(17,3,NULL,7,'2025-10-17','18:00','20:00','scheduled',0,0,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(18,3,NULL,8,'2025-10-20','18:00','20:00','scheduled',0,0,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(19,4,NULL,1,'2025-09-23','18:00','20:00','completed',1,1,NULL,NULL,400000,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(20,4,NULL,2,'2025-09-26','18:00','20:00','completed',1,1,NULL,NULL,400000,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(21,4,NULL,3,'2025-09-29','18:00','20:00','completed',1,1,NULL,NULL,400000,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(22,4,NULL,4,'2025-10-02','18:00','20:00','completed',1,1,NULL,NULL,400000,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(23,4,NULL,5,'2025-10-05','18:00','20:00','completed',1,1,NULL,NULL,400000,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(24,4,NULL,6,'2025-10-08','18:00','20:00','scheduled',0,0,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(25,4,NULL,7,'2025-10-11','18:00','20:00','scheduled',0,0,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(26,4,NULL,8,'2025-10-14','18:00','20:00','scheduled',0,0,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(27,4,NULL,9,'2025-10-17','18:00','20:00','scheduled',0,0,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(28,4,NULL,10,'2025-10-20','18:00','20:00','scheduled',0,0,NULL,NULL,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55');
/*!40000 ALTER TABLE `session_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_credits`
--

DROP TABLE IF EXISTS `student_credits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `student_credits` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `source_enrollment_id` int NOT NULL,
  `amount` int NOT NULL,
  `used_amount` int NOT NULL DEFAULT '0',
  `remaining_amount` int NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `expires_at` timestamp NULL DEFAULT NULL,
  `used_for_enrollment_id` int DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_credits`
--

LOCK TABLES `student_credits` WRITE;
/*!40000 ALTER TABLE `student_credits` DISABLE KEYS */;
/*!40000 ALTER TABLE `student_credits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `students`
--

DROP TABLE IF EXISTS `students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `students` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avatar` text COLLATE utf8mb4_unicode_ci,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_of_birth` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `grade_level_id` int DEFAULT NULL,
  `parent_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `parent_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `students_user_id_unique` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `students`
--

LOCK TABLES `students` WRITE;
/*!40000 ALTER TABLE `students` DISABLE KEYS */;
INSERT INTO `students` VALUES (28,2,'Nguyễn Văn A',NULL,NULL,NULL,NULL,'Nguyễn Văn X','0901234567',NULL,'2025-10-20 14:03:29','2025-10-20 14:03:29'),(29,3,'Trần Thị B',NULL,NULL,NULL,NULL,'Trần Văn Y','0902234567',NULL,'2025-10-20 14:03:29','2025-10-20 14:03:29'),(30,4,'Lê Văn C',NULL,NULL,NULL,NULL,'Lê Thị Z','0903234567',NULL,'2025-10-20 14:03:29','2025-10-20 14:03:29'),(31,5,'Phạm Thị D',NULL,NULL,NULL,NULL,'Phạm Văn K','0904234567',NULL,'2025-10-20 14:03:29','2025-10-20 14:03:29'),(32,6,'Hoàng Văn E',NULL,NULL,NULL,NULL,'Hoàng Thị L','0905234567',NULL,'2025-10-20 14:03:29','2025-10-20 14:03:29');
/*!40000 ALTER TABLE `students` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subjects`
--

DROP TABLE IF EXISTS `subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `subjects` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` int NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `subjects_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subjects`
--

LOCK TABLES `subjects` WRITE;
/*!40000 ALTER TABLE `subjects` DISABLE KEYS */;
INSERT INTO `subjects` VALUES (88,'Toán','Toán học các cấp',1,'2025-10-21 01:47:18'),(89,'Tiếng Anh','Tiếng Anh giao tiếp và học thuật',1,'2025-10-21 01:47:18'),(90,'Vật Lý','Vật lý phổ thông',1,'2025-10-21 01:47:18'),(91,'Hóa học','Hóa học phổ thông',1,'2025-10-21 01:47:18'),(92,'Sinh học','Sinh học phổ thông',1,'2025-10-21 01:47:18'),(93,'Ngữ Văn','Ngữ văn Việt Nam',1,'2025-10-21 01:47:18'),(94,'Lịch Sử','Lịch sử Việt Nam và thế giới',1,'2025-10-21 01:47:18'),(95,'Địa Lý','Địa lý tự nhiên và kinh tế',1,'2025-10-21 01:47:18'),(96,'Tin học','Tin học và lập trình',1,'2025-10-21 01:47:18'),(97,'IELTS','Luyện thi IELTS',1,'2025-10-21 01:47:18'),(98,'TOEFL','Luyện thi TOEFL',1,'2025-10-21 01:47:18'),(99,'SAT','Luyện thi SAT',1,'2025-10-21 01:47:18');
/*!40000 ALTER TABLE `subjects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `time_slots`
--

DROP TABLE IF EXISTS `time_slots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `time_slots` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tutor_id` int NOT NULL,
  `day_of_week` int NOT NULL,
  `shift_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_time` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `end_time` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_available` int NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=414 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `time_slots`
--

LOCK TABLES `time_slots` WRITE;
/*!40000 ALTER TABLE `time_slots` DISABLE KEYS */;
INSERT INTO `time_slots` VALUES (366,75,1,'evening','19:00','21:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(367,75,3,'evening','19:00','21:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(368,75,5,'evening','19:00','21:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(369,75,6,'afternoon','14:00','20:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(370,75,0,'afternoon','14:00','20:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(371,76,2,'evening','18:00','21:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(372,76,4,'evening','18:00','21:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(373,76,6,'evening','18:00','21:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(374,76,0,'morning','09:00','12:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(375,76,0,'afternoon','14:00','18:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(376,77,1,'evening','17:00','20:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(377,77,2,'evening','17:00','20:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(378,77,3,'evening','17:00','20:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(379,77,4,'evening','17:00','20:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(380,77,5,'evening','17:00','20:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(381,77,6,'afternoon','14:00','18:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(382,78,1,'evening','18:00','21:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(383,78,3,'evening','18:00','21:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(384,78,5,'evening','18:00','21:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(385,78,6,'afternoon','15:00','19:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(386,79,2,'evening','18:00','21:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(387,79,4,'evening','18:00','21:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(388,79,0,'morning','09:00','12:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(389,79,0,'afternoon','14:00','17:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(390,80,1,'evening','19:00','21:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(391,80,3,'evening','19:00','21:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(392,80,5,'evening','19:00','21:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(393,80,6,'afternoon','14:00','17:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(394,80,6,'evening','17:00','19:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(395,81,6,'morning','09:00','12:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(396,81,6,'afternoon','14:00','18:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(397,81,0,'morning','09:00','12:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(398,81,0,'afternoon','14:00','18:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(399,82,1,'evening','18:00','21:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(400,82,2,'evening','18:00','21:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(401,82,3,'evening','18:00','21:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(402,82,4,'evening','18:00','21:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(403,82,5,'evening','18:00','21:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(404,82,6,'afternoon','14:00','20:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(405,83,6,'morning','08:00','12:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(406,83,6,'afternoon','14:00','18:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(407,83,0,'morning','08:00','12:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(408,83,0,'afternoon','14:00','18:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(409,84,1,'evening','18:00','21:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(410,84,3,'evening','18:00','21:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(411,84,5,'evening','18:00','21:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(412,84,6,'morning','08:00','12:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18'),(413,84,0,'afternoon','14:00','18:00',1,'2025-10-21 01:47:18','2025-10-21 01:47:18');
/*!40000 ALTER TABLE `time_slots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `lesson_id` int NOT NULL,
  `student_id` int NOT NULL,
  `tutor_id` int NOT NULL,
  `amount` int NOT NULL,
  `method` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `payment_data` text COLLATE utf8mb4_unicode_ci,
  `transaction_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
INSERT INTO `transactions` VALUES (37,1,1,1,600000,'vnpay','completed',NULL,'VNP1760969009346001','2025-10-20 14:03:29','2025-10-20 14:03:29'),(38,2,2,2,560000,'momo','completed',NULL,'MOMO1760969009346002','2025-10-20 14:03:29','2025-10-20 14:03:29'),(39,3,3,3,500000,'bank_transfer','completed',NULL,'BANK1760969009346003','2025-10-20 14:03:29','2025-10-20 14:03:29'),(40,4,1,1,600000,'vnpay','completed',NULL,'VNP1760969009346004','2025-10-20 14:03:29','2025-10-20 14:03:29'),(41,5,4,4,440000,'momo','completed',NULL,'MOMO1760969009346005','2025-10-20 14:03:29','2025-10-20 14:03:29'),(42,6,5,5,400000,'bank_transfer','pending',NULL,NULL,'2025-10-20 14:03:29','2025-10-20 14:03:29'),(43,7,3,2,560000,'vnpay','pending',NULL,NULL,'2025-10-20 14:03:29','2025-10-20 14:03:29');
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tutor_availability`
--

DROP TABLE IF EXISTS `tutor_availability`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tutor_availability` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tutor_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `day_of_week` int NOT NULL,
  `start_time` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `end_time` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` int NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tutor_availability`
--

LOCK TABLES `tutor_availability` WRITE;
/*!40000 ALTER TABLE `tutor_availability` DISABLE KEYS */;
/*!40000 ALTER TABLE `tutor_availability` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tutor_documents`
--

DROP TABLE IF EXISTS `tutor_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tutor_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tutor_id` int NOT NULL,
  `document_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_url` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `admin_note` text COLLATE utf8mb4_unicode_ci,
  `uploaded_at` timestamp NOT NULL DEFAULT (now()),
  `reviewed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tutor_documents`
--

LOCK TABLES `tutor_documents` WRITE;
/*!40000 ALTER TABLE `tutor_documents` DISABLE KEYS */;
INSERT INTO `tutor_documents` VALUES (1,1,'id_card','https://example.com/docs/tutor1/id_card.jpg','approved',NULL,'2025-10-20 13:59:55',NULL),(2,1,'degree','https://example.com/docs/tutor1/degree.pdf','approved',NULL,'2025-10-20 13:59:55',NULL),(3,2,'id_card','https://example.com/docs/tutor2/id_card.jpg','approved',NULL,'2025-10-20 13:59:55',NULL),(4,2,'degree','https://example.com/docs/tutor2/degree.pdf','approved',NULL,'2025-10-20 13:59:55',NULL),(5,3,'id_card','https://example.com/docs/tutor3/id_card.jpg','approved',NULL,'2025-10-20 13:59:55',NULL),(6,3,'degree','https://example.com/docs/tutor3/degree.pdf','approved',NULL,'2025-10-20 13:59:55',NULL),(7,4,'id_card','https://example.com/docs/tutor4/id_card.jpg','approved',NULL,'2025-10-20 13:59:55',NULL),(8,4,'degree','https://example.com/docs/tutor4/degree.pdf','approved',NULL,'2025-10-20 13:59:55',NULL),(9,5,'id_card','https://example.com/docs/tutor5/id_card.jpg','approved',NULL,'2025-10-20 13:59:55',NULL),(10,5,'degree','https://example.com/docs/tutor5/degree.pdf','pending',NULL,'2025-10-20 13:59:55',NULL),(11,6,'id_card','https://example.com/docs/tutor6/id_card.jpg','approved',NULL,'2025-10-20 13:59:55',NULL),(12,6,'degree','https://example.com/docs/tutor6/degree.pdf','pending',NULL,'2025-10-20 13:59:55',NULL);
/*!40000 ALTER TABLE `tutor_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tutor_subjects`
--

DROP TABLE IF EXISTS `tutor_subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tutor_subjects` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tutor_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `grade_level_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=780 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tutor_subjects`
--

LOCK TABLES `tutor_subjects` WRITE;
/*!40000 ALTER TABLE `tutor_subjects` DISABLE KEYS */;
INSERT INTO `tutor_subjects` VALUES (655,75,88,100,'2025-10-21 01:47:18'),(656,75,88,101,'2025-10-21 01:47:18'),(657,75,88,102,'2025-10-21 01:47:18'),(658,75,90,100,'2025-10-21 01:47:18'),(659,75,90,101,'2025-10-21 01:47:18'),(660,75,90,102,'2025-10-21 01:47:18'),(661,76,89,100,'2025-10-21 01:47:18'),(662,76,89,101,'2025-10-21 01:47:18'),(663,76,89,102,'2025-10-21 01:47:18'),(664,76,89,105,'2025-10-21 01:47:18'),(665,76,89,106,'2025-10-21 01:47:18'),(666,76,89,108,'2025-10-21 01:47:18'),(667,76,97,100,'2025-10-21 01:47:18'),(668,76,97,101,'2025-10-21 01:47:18'),(669,76,97,102,'2025-10-21 01:47:18'),(670,76,97,105,'2025-10-21 01:47:18'),(671,76,97,106,'2025-10-21 01:47:18'),(672,76,97,108,'2025-10-21 01:47:18'),(673,76,98,100,'2025-10-21 01:47:18'),(674,76,98,101,'2025-10-21 01:47:18'),(675,76,98,102,'2025-10-21 01:47:18'),(676,76,98,105,'2025-10-21 01:47:18'),(677,76,98,106,'2025-10-21 01:47:18'),(678,76,98,108,'2025-10-21 01:47:18'),(679,77,88,93,'2025-10-21 01:47:18'),(680,77,88,94,'2025-10-21 01:47:18'),(681,77,88,95,'2025-10-21 01:47:18'),(682,77,88,96,'2025-10-21 01:47:18'),(683,77,88,97,'2025-10-21 01:47:18'),(684,77,88,98,'2025-10-21 01:47:18'),(685,77,88,99,'2025-10-21 01:47:18'),(686,77,90,93,'2025-10-21 01:47:18'),(687,77,90,94,'2025-10-21 01:47:18'),(688,77,90,95,'2025-10-21 01:47:18'),(689,77,90,96,'2025-10-21 01:47:18'),(690,77,90,97,'2025-10-21 01:47:18'),(691,77,90,98,'2025-10-21 01:47:18'),(692,77,90,99,'2025-10-21 01:47:18'),(693,77,96,93,'2025-10-21 01:47:18'),(694,77,96,94,'2025-10-21 01:47:18'),(695,77,96,95,'2025-10-21 01:47:18'),(696,77,96,96,'2025-10-21 01:47:18'),(697,77,96,97,'2025-10-21 01:47:18'),(698,77,96,98,'2025-10-21 01:47:18'),(699,77,96,99,'2025-10-21 01:47:18'),(700,78,91,98,'2025-10-21 01:47:18'),(701,78,91,99,'2025-10-21 01:47:18'),(702,78,91,100,'2025-10-21 01:47:18'),(703,78,91,101,'2025-10-21 01:47:18'),(704,78,91,102,'2025-10-21 01:47:18'),(705,78,91,104,'2025-10-21 01:47:18'),(706,78,92,98,'2025-10-21 01:47:18'),(707,78,92,99,'2025-10-21 01:47:18'),(708,78,92,100,'2025-10-21 01:47:18'),(709,78,92,101,'2025-10-21 01:47:18'),(710,78,92,102,'2025-10-21 01:47:18'),(711,78,92,104,'2025-10-21 01:47:18'),(712,79,94,100,'2025-10-21 01:47:18'),(713,79,94,101,'2025-10-21 01:47:18'),(714,79,94,102,'2025-10-21 01:47:18'),(715,79,95,100,'2025-10-21 01:47:18'),(716,79,95,101,'2025-10-21 01:47:18'),(717,79,95,102,'2025-10-21 01:47:18'),(718,80,93,100,'2025-10-21 01:47:18'),(719,80,93,101,'2025-10-21 01:47:18'),(720,80,93,102,'2025-10-21 01:47:18'),(721,80,93,103,'2025-10-21 01:47:18'),(722,80,93,104,'2025-10-21 01:47:18'),(723,81,89,101,'2025-10-21 01:47:18'),(724,81,89,102,'2025-10-21 01:47:18'),(725,81,89,107,'2025-10-21 01:47:18'),(726,81,89,106,'2025-10-21 01:47:18'),(727,81,89,109,'2025-10-21 01:47:18'),(728,81,99,101,'2025-10-21 01:47:18'),(729,81,99,102,'2025-10-21 01:47:18'),(730,81,99,107,'2025-10-21 01:47:18'),(731,81,99,106,'2025-10-21 01:47:18'),(732,81,99,109,'2025-10-21 01:47:18'),(733,81,98,101,'2025-10-21 01:47:18'),(734,81,98,102,'2025-10-21 01:47:18'),(735,81,98,107,'2025-10-21 01:47:18'),(736,81,98,106,'2025-10-21 01:47:18'),(737,81,98,109,'2025-10-21 01:47:18'),(738,82,89,96,'2025-10-21 01:47:18'),(739,82,89,97,'2025-10-21 01:47:18'),(740,82,89,98,'2025-10-21 01:47:18'),(741,82,89,99,'2025-10-21 01:47:18'),(742,82,89,100,'2025-10-21 01:47:18'),(743,82,89,101,'2025-10-21 01:47:18'),(744,82,89,102,'2025-10-21 01:47:18'),(745,82,89,105,'2025-10-21 01:47:18'),(746,82,89,108,'2025-10-21 01:47:18'),(747,82,97,96,'2025-10-21 01:47:18'),(748,82,97,97,'2025-10-21 01:47:18'),(749,82,97,98,'2025-10-21 01:47:18'),(750,82,97,99,'2025-10-21 01:47:18'),(751,82,97,100,'2025-10-21 01:47:18'),(752,82,97,101,'2025-10-21 01:47:18'),(753,82,97,102,'2025-10-21 01:47:18'),(754,82,97,105,'2025-10-21 01:47:18'),(755,82,97,108,'2025-10-21 01:47:18'),(756,83,88,96,'2025-10-21 01:47:18'),(757,83,88,97,'2025-10-21 01:47:18'),(758,83,88,98,'2025-10-21 01:47:18'),(759,83,88,99,'2025-10-21 01:47:18'),(760,83,88,100,'2025-10-21 01:47:18'),(761,83,88,101,'2025-10-21 01:47:18'),(762,83,88,102,'2025-10-21 01:47:18'),(763,83,88,109,'2025-10-21 01:47:18'),(764,83,96,96,'2025-10-21 01:47:18'),(765,83,96,97,'2025-10-21 01:47:18'),(766,83,96,98,'2025-10-21 01:47:18'),(767,83,96,99,'2025-10-21 01:47:18'),(768,83,96,100,'2025-10-21 01:47:18'),(769,83,96,101,'2025-10-21 01:47:18'),(770,83,96,102,'2025-10-21 01:47:18'),(771,83,96,109,'2025-10-21 01:47:18'),(772,84,91,100,'2025-10-21 01:47:18'),(773,84,91,101,'2025-10-21 01:47:18'),(774,84,91,102,'2025-10-21 01:47:18'),(775,84,91,104,'2025-10-21 01:47:18'),(776,84,92,100,'2025-10-21 01:47:18'),(777,84,92,101,'2025-10-21 01:47:18'),(778,84,92,102,'2025-10-21 01:47:18'),(779,84,92,104,'2025-10-21 01:47:18');
/*!40000 ALTER TABLE `tutor_subjects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tutors`
--

DROP TABLE IF EXISTS `tutors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tutors` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avatar` text COLLATE utf8mb4_unicode_ci,
  `bio` text COLLATE utf8mb4_unicode_ci,
  `teaching_method` text COLLATE utf8mb4_unicode_ci,
  `education` text COLLATE utf8mb4_unicode_ci,
  `certifications` text COLLATE utf8mb4_unicode_ci,
  `achievements` text COLLATE utf8mb4_unicode_ci,
  `subjects` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `languages` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'Tiếng Việt',
  `experience` int NOT NULL DEFAULT '0',
  `hourly_rate` int NOT NULL,
  `rating` int DEFAULT '0',
  `total_reviews` int DEFAULT '0',
  `total_students` int DEFAULT '0',
  `video_intro` text COLLATE utf8mb4_unicode_ci,
  `occupation` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verification_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `is_active` int NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `response_time` int DEFAULT '0',
  `response_rate` int DEFAULT '0',
  `completion_rate` int DEFAULT '0',
  `cancellation_rate` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `tutors_user_id_unique` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tutors`
--

LOCK TABLES `tutors` WRITE;
/*!40000 ALTER TABLE `tutors` DISABLE KEYS */;
INSERT INTO `tutors` VALUES (75,137,'Nguyễn Thị Mai','https://i.pravatar.cc/150?img=5','Tôi là giáo viên Toán có 5 năm kinh nghiệm giảng dạy THPT. Tôi đam mê giúp học sinh hiểu rõ bản chất của toán học và phát triển tư duy logic. Với phương pháp giảng dạy linh hoạt và tận tâm, tôi đã giúp nhiều học sinh cải thiện điểm số và yêu thích môn Toán hơn.','Tôi sử dụng phương pháp giảng dạy tích cực, khuyến khích học sinh tự suy nghĩ và giải quyết vấn đề. Mỗi bài học đều có bài tập thực hành và ứng dụng thực tế để học sinh thấy được tính hữu ích của môn Toán. Sử dụng công nghệ hỗ trợ như phần mềm vẽ đồ thị, app luyện tập trực tuyến và video minh họa để tăng hiệu quả học tập.','[{\"degree\":\"Thạc sĩ Toán học ứng dụng\",\"school\":\"Đại học Khoa học Tự nhiên - ĐHQGHN\",\"year\":\"2020\"},{\"degree\":\"Cử nhân Toán học\",\"school\":\"Đại học Sư phạm Hà Nội\",\"year\":\"2018\"}]','[\"Chứng chỉ giáo viên dạy giỏi cấp thành phố 2023\",\"Chứng chỉ bồi dưỡng giáo viên THPT\",\"Chứng chỉ tin học ứng dụng trong giảng dạy\",\"Giấy chứng nhận hoàn thành khóa đào tạo phương pháp giảng dạy tích cực\"]','[\"Top 10 giáo viên xuất sắc năm 2023\",\"Giải Nhì cuộc thi giáo án điện tử cấp thành phố 2022\",\"95% học sinh đạt điểm 8+ trong kỳ thi THPT\",\"Hướng dẫn 5 học sinh đạt giải Olympic Toán cấp tỉnh\"]','[]','Tiếng Việt',5,200000,49,128,45,NULL,'Giáo viên','verified',1,'2025-10-21 01:47:18','2025-10-21 01:47:18',0,0,0,0),(76,138,'Trần Văn Hùng','https://i.pravatar.cc/150?img=12','Giáo viên Tiếng Anh chuyên luyện thi IELTS, TOEFL với 7 năm kinh nghiệm. Đã giúp hơn 200 học sinh đạt điểm mục tiêu. Tôi tự tin có thể giúp bạn đạt được ước mơ du học hoặc làm việc tại các công ty quốc tế.','Phương pháp học tập tích cực với trọng tâm là giao tiếp và thực hành. Sử dụng tài liệu cập nhật và mô phỏng thi thực tế. Lộ trình học được cá nhân hóa theo từng học viên với các bài kiểm tra định kỳ để đánh giá tiến độ. Áp dụng phương pháp immersion - học sinh được nghe, nói, đọc, viết tiếng Anh trong suốt buổi học.','[{\"degree\":\"Thạc sĩ Ngôn ngữ Anh\",\"school\":\"Đại học Ngoại ngữ - ĐHQGHN\",\"year\":\"2016\"},{\"degree\":\"Cử nhân Sư phạm Tiếng Anh\",\"school\":\"Đại học Sư phạm Hà Nội\",\"year\":\"2014\"},{\"degree\":\"Certificate in Advanced English Teaching Methods\",\"school\":\"British Council\",\"year\":\"2017\"}]','[\"IELTS 8.5 (L9.0 R9.0 W8.0 S8.0)\",\"TOEFL iBT 115/120\",\"TESOL Certificate - International House\",\"CELTA (Certificate in English Language Teaching to Adults)\",\"Cambridge TKT (Teaching Knowledge Test) Module 1,2,3\",\"Chứng chỉ giảng viên IELTS của IDP\"]','[\"Giảng viên xuất sắc năm 2022\",\"Top 5 giáo viên IELTS tốt nhất VN 2023\",\"100+ học sinh đạt IELTS 7.0+\",\"15 học sinh đạt IELTS 8.5+\",\"Tác giả sách \\\"Chinh phục IELTS Speaking 8.0\\\"\",\"Diễn giả tại Hội thảo giảng dạy IELTS Quốc gia 2023\"]','[]','Tiếng Việt',7,250000,50,95,67,NULL,'Chuyên gia','verified',1,'2025-10-21 01:47:18','2025-10-21 01:47:18',0,0,0,0),(77,139,'Lê Minh Tú','https://i.pravatar.cc/150?img=33','Sinh viên năm cuối ngành Công nghệ thông tin, đam mê giảng dạy Toán và Tin học cho học sinh THCS. Với kiến thức vững vàng và cách tiếp cận trẻ trung, tôi giúp các em học một cách thú vị và hiệu quả.','Sử dụng các ví dụ thực tế, game hóa và công nghệ để làm cho việc học trở nên thú vị và dễ hiểu. Kết hợp lý thuyết với thực hành ngay trong buổi học. Áp dụng phương pháp học qua dự án (Project-based Learning) - học sinh được làm các mini project để củng cố kiến thức. Sử dụng Kahoot, Quizizz và các công cụ tương tác để tăng sự hứng thú.','[{\"degree\":\"Sinh viên năm 4 Công nghệ thông tin (GPA 3.8/4.0)\",\"school\":\"Đại học Bách khoa Hà Nội\",\"year\":\"2025\"},{\"degree\":\"Online Certificate: CS50 - Introduction to Computer Science\",\"school\":\"Harvard University (edX)\",\"year\":\"2022\"},{\"degree\":\"Online Certificate: Machine Learning Specialization\",\"school\":\"Stanford University (Coursera)\",\"year\":\"2023\"}]','[\"Giải Nhất Olympic Tin học sinh viên 2023\",\"Google IT Support Professional Certificate\",\"Python for Everybody Specialization\",\"JavaScript Algorithms and Data Structures (freeCodeCamp)\",\"Chứng chỉ TOEIC 900/990\"]','[\"GPA 3.8/4.0 - Sinh viên xuất sắc 3 năm liên tiếp\",\"Học bổng khuyến khích học tập 100% (4 năm)\",\"Giải Nhì cuộc thi Hackathon HUST 2023\",\"Top 50 Vietnam National Informatics Olympiad 2021\",\"Freelance developer với 10+ dự án thành công\"]','[]','Tiếng Việt',3,120000,47,76,34,NULL,'Sinh viên','verified',1,'2025-10-21 01:47:18','2025-10-21 01:47:18',0,0,0,0),(78,140,'Phạm Thu Hà','https://i.pravatar.cc/150?img=47','Giáo viên Hóa học và Sinh học với 4 năm kinh nghiệm, chuyên luyện thi đại học khối B. Đã giúp 90% học sinh đạt điểm cao và đỗ đại học. Tôi cam kết mang lại kết quả tốt nhất cho học sinh.','Kết hợp lý thuyết với thực hành thí nghiệm (khi có thể). Tập trung vào hiểu bản chất và ứng dụng thực tế. Có hệ thống bài tập từ cơ bản đến nâng cao. Sử dụng mô hình 3D, video thí nghiệm và phần mềm mô phỏng để học sinh dễ hình dung. Xây dựng sơ đồ tư duy (mindmap) để hệ thống hóa kiến thức.','[{\"degree\":\"Thạc sĩ Hóa học Hữu cơ\",\"school\":\"Đại học Khoa học Tự nhiên - ĐHQGHN\",\"year\":\"2021\"},{\"degree\":\"Cử nhân Sư phạm Hóa học\",\"school\":\"Đại học Sư phạm Hà Nội\",\"year\":\"2019\"}]','[\"Chứng chỉ giảng dạy THPT\",\"Chứng chỉ bồi dưỡng thường xuyên giáo viên THPT môn Hóa\",\"Chứng chỉ An toàn phòng thí nghiệm Hóa học\",\"Giấy chứng nhận tham gia Workshop \\\"Đổi mới phương pháp dạy Hóa\\\"\"]','[\"90% học sinh đỗ đại học khối B\",\"7 học sinh đạt điểm 9+ môn Hóa trong kỳ thi THPT 2023\",\"Giáo viên chủ nhiệm lớp đạt danh hiệu Tập thể lao động xuất sắc\",\"Bài giảng \\\"Phản ứng oxi hóa khử\\\" được chọn làm mẫu cấp thành phố\",\"Hướng dẫn nhóm học sinh nghiên cứu khoa học cấp trường\"]','[]','Tiếng Việt',4,180000,48,54,28,NULL,'Giáo viên','verified',1,'2025-10-21 01:47:18','2025-10-21 01:47:18',0,0,0,0),(79,141,'Đỗ Văn Thành','https://i.pravatar.cc/150?img=15','Giáo viên Lịch Sử và Địa Lý với đam mê truyền đạt kiến thức xã hội. Có 4 năm kinh nghiệm giảng dạy THPT, tôi sử dụng các câu chuyện lịch sử thú vị và bản đồ tương tác để giúp học sinh hiểu sâu hơn.','Kết hợp giảng dạy lý thuyết với các case study, video tài liệu và thảo luận nhóm. Học sinh sẽ học cách phân tích sự kiện lịch sử và hiểu được các yếu tố địa lý ảnh hưởng đến cuộc sống. Sử dụng trò chơi nhập vai lịch sử, bản đồ tương tác và timeline để tăng tính sinh động. Khuyến khích học sinh tư duy phản biện về các sự kiện lịch sử.','[{\"degree\":\"Thạc sĩ Lịch sử Việt Nam\",\"school\":\"Đại học Khoa học Xã hội và Nhân văn - ĐHQGHN\",\"year\":\"2021\"},{\"degree\":\"Cử nhân Sư phạm Lịch sử\",\"school\":\"Đại học Sư phạm Hà Nội\",\"year\":\"2019\"}]','[\"Chứng chỉ giảng dạy THPT\",\"Chứng chỉ bồi dưỡng giáo viên môn Lịch sử - Địa lý\",\"Giấy chứng nhận hoàn thành khóa \\\"Dạy học tích hợp liên môn\\\"\",\"Chứng chỉ Quản lý di sản văn hóa (UNESCO)\"]','[\"Giải Ba cuộc thi \\\"Giáo viên dạy giỏi cấp thành phố\\\" môn Lịch sử 2022\",\"Bài giảng \\\"Cách mạng tháng Tám 1945\\\" được chọn làm mẫu cấp quận\",\"Hướng dẫn học sinh tham quan 20+ di tích lịch sử\",\"Biên soạn bộ câu hỏi trắc nghiệm Lịch sử - Địa lý cho trường\"]','[]','Tiếng Việt',4,150000,46,42,31,NULL,'Giáo viên','verified',1,'2025-10-21 01:47:18','2025-10-21 01:47:18',0,0,0,0),(80,142,'Hoàng Thị Lan','https://i.pravatar.cc/150?img=23','Giáo viên Ngữ Văn chuyên luyện thi THPT Quốc gia và Đại học. 6 năm kinh nghiệm với nhiều học sinh đạt điểm cao. Tôi yêu thích văn học Việt Nam và luôn truyền cảm hứng cho học sinh yêu môn Văn.','Phân tích tác phẩm văn học một cách sâu sắc và dễ hiểu. Hướng dẫn kỹ năng làm bài thi, viết văn nghị luận và văn tự sự. Có bộ tài liệu tổng hợp đầy đủ và bài tập luyện thi. Khuyến khích học sinh đọc nhiều sách, viết nhật ký và chia sẻ cảm nhận. Tổ chức các buổi thảo luận văn học, đọc diễn cảm để nâng cao khả năng thưởng thức văn chương.','[{\"degree\":\"Thạc sĩ Văn học Việt Nam\",\"school\":\"Đại học Khoa học Xã hội và Nhân văn - ĐHQGHN\",\"year\":\"2019\"},{\"degree\":\"Cử nhân Sư phạm Ngữ văn\",\"school\":\"Đại học Sư phạm Hà Nội\",\"year\":\"2017\"}]','[\"Chứng chỉ giảng dạy THPT\",\"Chứng chỉ bồi dưỡng thường xuyên giáo viên THPT môn Ngữ văn\",\"Giấy chứng nhận tham gia Workshop \\\"Đổi mới kiểm tra đánh giá môn Văn\\\"\",\"Chứng chỉ viết báo chí (Hội Nhà báo Việt Nam)\"]','[\"Giáo viên giỏi cấp quận 2022\",\"Giải Nhì cuộc thi \\\"Giáo viên dạy giỏi cấp thành phố\\\" môn Văn 2023\",\"Hướng dẫn 12 học sinh đạt giải cuộc thi viết văn cấp thành phố\",\"85% học sinh đạt điểm 8+ môn Văn trong kỳ thi THPT\",\"Tác giả 20+ bài viết về phương pháp dạy Văn trên tạp chí Giáo dục\"]','[]','Tiếng Việt',6,190000,49,88,52,NULL,'Giáo viên','verified',1,'2025-10-21 01:47:18','2025-10-21 01:47:18',0,0,0,0),(81,143,'Bùi Minh Đức','https://i.pravatar.cc/150?img=60','Chuyên gia luyện thi SAT và TOEFL với 5 năm kinh nghiệm. Từng du học tại Mỹ và hiểu rõ yêu cầu của các kỳ thi quốc tế. Đã giúp 100+ học sinh đạt điểm cao và nhận học bổng du học.','Lộ trình học được cá nhân hóa dựa trên điểm xuất phát và mục tiêu của học viên. Sử dụng tài liệu chuẩn quốc tế và mô phỏng thi thực chiến. Coaching 1-1 tận tâm và theo sát tiến độ. Áp dụng phương pháp \"Test-Review-Improve\" với các bài kiểm tra định kỳ theo format chuẩn SAT/TOEFL. Chia sẻ kinh nghiệm du học và hồ sơ xin học bổng.','[{\"degree\":\"MBA - Master of Business Administration\",\"school\":\"University of California, Berkeley (Haas School)\",\"year\":\"2018\"},{\"degree\":\"Bachelor of Science in Economics\",\"school\":\"University of California, Berkeley\",\"year\":\"2016\"},{\"degree\":\"Cử nhân Kinh tế Đối ngoại\",\"school\":\"Đại học Ngoại thương Hà Nội\",\"year\":\"2014\"}]','[\"SAT 1550/1600 (Math 800, Reading & Writing 750)\",\"TOEFL iBT 118/120 (R30 L29 S29 W30)\",\"GRE 335/340 (Quant 170, Verbal 165)\",\"MBA - UC Berkeley Haas School of Business\",\"CFA Level 2 Candidate\",\"Certificate in College Counseling (UCLA Extension)\"]','[\"Top 3 SAT tutors VN 2023 (theo VnExpress Education)\",\"98% học sinh đạt mục tiêu (1400+ SAT, 100+ TOEFL)\",\"Học bổng toàn phần $250,000 MBA Berkeley\",\"Hướng dẫn 25+ học sinh nhận học bổng du học Mỹ\",\"10 học sinh đạt SAT 1500+\",\"Cựu Investment Analyst tại Goldman Sachs\"]','[]','Tiếng Việt',5,300000,50,35,28,NULL,'Chuyên gia','verified',1,'2025-10-21 01:47:18','2025-10-21 01:47:18',0,0,0,0),(82,144,'Ngô Thị Hương','https://i.pravatar.cc/150?img=27','Giáo viên Tiếng Anh với chuyên môn IELTS, có 5 năm kinh nghiệm giảng dạy từ thiểu niên đến người đi làm. IELTS 8.0, đam mê giúp học viên tự tin giao tiếp và đạt band điểm mục tiêu.','Tập trung phát triển 4 kỹ năng một cách cân bằng. Luyện phát âm chuẩn, mở rộng vốn từ vựng và cấu trúc ngữ pháp trong ngữ cảnh thực tế. Có chiến lược làm bài thi hiệu quả. Sử dụng Shadowing technique để cải thiện Speaking và Listening. Tổ chức speaking club và debate để học viên thực hành với nhau.','[{\"degree\":\"Thạc sĩ TESOL (Teaching English to Speakers of Other Languages)\",\"school\":\"University of Sheffield, UK\",\"year\":\"2020\"},{\"degree\":\"Cử nhân Sư phạm Tiếng Anh\",\"school\":\"Đại học Ngoại ngữ - ĐHQGHN\",\"year\":\"2018\"}]','[\"IELTS 8.0 (L8.5 R8.5 W7.5 S7.5)\",\"TESOL Master Degree (University of Sheffield)\",\"CELTA (Certificate in English Language Teaching to Adults)\",\"TKT (Teaching Knowledge Test) Band 4 - Tất cả modules\",\"Certificate in Teaching IELTS (IDP Education)\",\"Certificate in Business English Teaching (Cambridge)\"]','[\"85% học sinh đạt IELTS band 6.5+\",\"30+ học sinh đạt IELTS 7.5+\",\"Giáo viên được yêu thích nhất tại trung tâm Anh ngữ ABC (2022)\",\"Tác giả blog \\\"IELTS Tips\\\" với 50,000+ followers\",\"Diễn giả tại workshop \\\"Chiến lược học IELTS hiệu quả\\\" 2023\"]','[]','Tiếng Việt',5,220000,48,67,48,NULL,'Chuyên gia','verified',1,'2025-10-21 01:47:18','2025-10-21 01:47:18',0,0,0,0),(83,145,'Vũ Hoàng Nam','https://i.pravatar.cc/150?img=68','Kỹ sư phần mềm kiêm giáo viên Toán và Tin học. Với kinh nghiệm làm việc tại các công ty công nghệ lớn, tôi mang kiến thức thực tế vào giảng dạy, giúp học sinh hiểu được ứng dụng thực tiễn của môn học.','Kết hợp lý thuyết với coding thực hành. Sử dụng các dự án mini để học sinh áp dụng kiến thức ngay lập tức. Học Toán qua lập trình và giải thuật. Áp dụng phương pháp \"Learning by Building\" - học sinh sẽ xây dựng các ứng dụng thực tế như game, website, chatbot. Hướng dẫn sử dụng Git, GitHub và các công cụ lập trình chuyên nghiệp.','[{\"degree\":\"Thạc sĩ Khoa học Máy tính (Chuyên ngành AI & Machine Learning)\",\"school\":\"Đại học Bách khoa Hà Nội\",\"year\":\"2020\"},{\"degree\":\"Cử nhân Công nghệ thông tin\",\"school\":\"Đại học Bách khoa Hà Nội\",\"year\":\"2018\"},{\"degree\":\"Deep Learning Specialization\",\"school\":\"DeepLearning.AI (Coursera)\",\"year\":\"2021\"}]','[\"AWS Certified Solutions Architect - Professional\",\"Google Cloud Professional Cloud Architect\",\"Microsoft Certified: Azure Solutions Architect Expert\",\"Certified Kubernetes Administrator (CKA)\",\"TensorFlow Developer Certificate\",\"Oracle Certified Professional Java SE Programmer\"]','[\"Senior Software Engineer tại FPT Software (5 năm)\",\"Giải Nhất Hackathon FPT 2022 - AI-powered Education Platform\",\"Contributor cho 3 open-source projects trên GitHub (2000+ stars)\",\"Speaker tại Vietnam Mobile Day 2023\",\"15+ bài viết kỹ thuật trên viblo.asia\",\"Mentor cho 20+ sinh viên thực tập\"]','[]','Tiếng Việt',3,200000,47,38,24,NULL,'Chuyên gia','verified',1,'2025-10-21 01:47:18','2025-10-21 01:47:18',0,0,0,0),(84,146,'Nguyễn Minh Anh','https://i.pravatar.cc/150?img=38','Sinh viên Y khoa giỏi, chuyên dạy Hóa học và Sinh học cho học sinh THPT. Với kiến thức y khoa, tôi giúp học sinh hiểu sâu về cơ thể người và các phản ứng hóa học trong y học.','Giảng dạy lý thuyết kết hợp với các ví dụ y học thực tế. Hệ thống hóa kiến thức và tập trung vào các dạng bài thi thường gặp. Có ngân hàng câu hỏi lớn để luyện tập. Sử dụng hình ảnh y học, video phẫu thuật (phù hợp) và case study bệnh án để học sinh hiểu sâu hơn. Chia sẻ kinh nghiệm thi đại học khối B và học Y khoa.','[{\"degree\":\"Sinh viên năm 6 Y khoa đa khoa (GPA 3.9/4.0)\",\"school\":\"Đại học Y Hà Nội\",\"year\":\"2025\"},{\"degree\":\"Online Certificate: Medical Neuroscience\",\"school\":\"Duke University (Coursera)\",\"year\":\"2023\"}]','[\"Học bổng toàn phần Đại học Y Hà Nội (6 năm)\",\"Chứng chỉ Sơ cấp cứu tim phổi - CPR (Hội Hồi sức cấp cứu VN)\",\"Certificate in Human Anatomy (Coursera)\",\"Certificate in Medical Neuroscience (Duke University)\",\"IELTS 7.5 (đọc tài liệu y học tiếng Anh)\"]','[\"GPA 3.9/4.0 - Top 5 khóa học\",\"Giải Nhì Olympic Sinh học Sinh viên toàn quốc 2023\",\"Giải Ba Olympic Hóa học Sinh viên 2022\",\"Sinh viên 5 tốt cấp trường 3 năm liên tiếp\",\"Tình nguyện viên y tế tại 5 chương trình khám bệnh từ thiện\",\"Nghiên cứu sinh tại phòng thí nghiệm Sinh lý bệnh - ĐH Y HN\"]','[]','Tiếng Việt',2,140000,46,29,18,NULL,'Sinh viên','verified',1,'2025-10-21 01:47:18','2025-10-21 01:47:18',0,0,0,0);
/*!40000 ALTER TABLE `tutors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'student',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` text COLLATE utf8mb4_unicode_ci,
  `is_active` int NOT NULL DEFAULT '1',
  `last_login` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `users_username_unique` (`username`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=147 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (137,'tutor_mai','$2a$10$T80wbdANpOOO9dsNx7rYjuDMlw.3BmZ89MfvYCi.T26Ooo5.S6vc2','mai@example.com','tutor','2025-10-21 01:47:18','2025-10-21 01:47:18',NULL,NULL,1,NULL),(138,'tutor_hung','$2a$10$T80wbdANpOOO9dsNx7rYjuDMlw.3BmZ89MfvYCi.T26Ooo5.S6vc2','hung@example.com','tutor','2025-10-21 01:47:18','2025-10-21 01:47:18',NULL,NULL,1,NULL),(139,'tutor_tu','$2a$10$T80wbdANpOOO9dsNx7rYjuDMlw.3BmZ89MfvYCi.T26Ooo5.S6vc2','tu@example.com','tutor','2025-10-21 01:47:18','2025-10-21 01:47:18',NULL,NULL,1,NULL),(140,'tutor_ha','$2a$10$T80wbdANpOOO9dsNx7rYjuDMlw.3BmZ89MfvYCi.T26Ooo5.S6vc2','ha@example.com','tutor','2025-10-21 01:47:18','2025-10-21 01:47:18',NULL,NULL,1,NULL),(141,'tutor_thanh','$2a$10$T80wbdANpOOO9dsNx7rYjuDMlw.3BmZ89MfvYCi.T26Ooo5.S6vc2','thanh@example.com','tutor','2025-10-21 01:47:18','2025-10-21 01:47:18',NULL,NULL,1,NULL),(142,'tutor_lan','$2a$10$T80wbdANpOOO9dsNx7rYjuDMlw.3BmZ89MfvYCi.T26Ooo5.S6vc2','lan@example.com','tutor','2025-10-21 01:47:18','2025-10-21 01:47:18',NULL,NULL,1,NULL),(143,'tutor_duc','$2a$10$T80wbdANpOOO9dsNx7rYjuDMlw.3BmZ89MfvYCi.T26Ooo5.S6vc2','duc@example.com','tutor','2025-10-21 01:47:18','2025-10-21 01:47:18',NULL,NULL,1,NULL),(144,'tutor_huong','$2a$10$T80wbdANpOOO9dsNx7rYjuDMlw.3BmZ89MfvYCi.T26Ooo5.S6vc2','huong@example.com','tutor','2025-10-21 01:47:18','2025-10-21 01:47:18',NULL,NULL,1,NULL),(145,'tutor_nam','$2a$10$T80wbdANpOOO9dsNx7rYjuDMlw.3BmZ89MfvYCi.T26Ooo5.S6vc2','nam@example.com','tutor','2025-10-21 01:47:18','2025-10-21 01:47:18',NULL,NULL,1,NULL),(146,'tutor_anh','$2a$10$T80wbdANpOOO9dsNx7rYjuDMlw.3BmZ89MfvYCi.T26Ooo5.S6vc2','anh.nguyen@example.com','tutor','2025-10-21 01:47:18','2025-10-21 01:47:18',NULL,NULL,1,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `video_call_sessions`
--

DROP TABLE IF EXISTS `video_call_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `video_call_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `enrollment_id` int DEFAULT NULL,
  `lesson_id` int DEFAULT NULL,
  `session_record_id` int DEFAULT NULL,
  `tutor_id` int NOT NULL,
  `student_id` int NOT NULL,
  `room_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `access_token` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tutor_token` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_token` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scheduled_start_time` timestamp NOT NULL,
  `scheduled_end_time` timestamp NOT NULL,
  `tutor_joined_at` timestamp NULL DEFAULT NULL,
  `student_joined_at` timestamp NULL DEFAULT NULL,
  `tutor_left_at` timestamp NULL DEFAULT NULL,
  `student_left_at` timestamp NULL DEFAULT NULL,
  `session_ended_at` timestamp NULL DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `payment_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unpaid',
  `can_student_join` int NOT NULL DEFAULT '1',
  `can_tutor_join` int NOT NULL DEFAULT '1',
  `expires_at` timestamp NOT NULL,
  `used_count` int NOT NULL DEFAULT '0',
  `ip_addresses` text COLLATE utf8mb4_unicode_ci,
  `recording_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `video_call_sessions_room_name_unique` (`room_name`),
  UNIQUE KEY `video_call_sessions_access_token_unique` (`access_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `video_call_sessions`
--

LOCK TABLES `video_call_sessions` WRITE;
/*!40000 ALTER TABLE `video_call_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `video_call_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wallet_transactions`
--

DROP TABLE IF EXISTS `wallet_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wallet_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wallet_id` int NOT NULL,
  `type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` int NOT NULL,
  `balance_before` int NOT NULL,
  `balance_after` int NOT NULL,
  `related_id` int DEFAULT NULL,
  `related_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `performed_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallet_transactions`
--

LOCK TABLES `wallet_transactions` WRITE;
/*!40000 ALTER TABLE `wallet_transactions` DISABLE KEYS */;
INSERT INTO `wallet_transactions` VALUES (1,2,'escrow_release',400000,500000,900000,1,'session','Giải ngân cho buổi học #1',NULL,'2025-10-20 13:59:55'),(2,3,'escrow_release',400000,600000,1000000,2,'session','Giải ngân cho buổi học #2',NULL,'2025-10-20 13:59:55'),(3,4,'escrow_release',400000,700000,1100000,3,'session','Giải ngân cho buổi học #3',NULL,'2025-10-20 13:59:55'),(4,5,'escrow_release',400000,800000,1200000,4,'session','Giải ngân cho buổi học #4',NULL,'2025-10-20 13:59:55'),(5,6,'escrow_release',400000,900000,1300000,5,'session','Giải ngân cho buổi học #5',NULL,'2025-10-20 13:59:55');
/*!40000 ALTER TABLE `wallet_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wallets`
--

DROP TABLE IF EXISTS `wallets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wallets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` int NOT NULL,
  `owner_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `available_balance` int NOT NULL DEFAULT '0',
  `pending_balance` int NOT NULL DEFAULT '0',
  `withdrawn_balance` int NOT NULL DEFAULT '0',
  `total_earned` int NOT NULL DEFAULT '0',
  `last_payout_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallets`
--

LOCK TABLES `wallets` WRITE;
/*!40000 ALTER TABLE `wallets` DISABLE KEYS */;
INSERT INTO `wallets` VALUES (1,0,'platform',5000000,0,0,5000000,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(2,1,'tutor',900000,400000,0,2200000,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(3,2,'tutor',1000000,400000,0,2400000,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(4,3,'tutor',1100000,400000,0,2600000,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(5,4,'tutor',1200000,400000,0,2800000,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(6,5,'tutor',1300000,400000,0,3000000,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(7,6,'tutor',1400000,400000,0,3200000,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(8,7,'tutor',1500000,400000,0,3400000,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(9,8,'tutor',1600000,400000,0,3600000,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(10,9,'tutor',1700000,400000,0,3800000,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55'),(11,10,'tutor',1800000,400000,0,4000000,NULL,'2025-10-20 13:59:55','2025-10-20 13:59:55');
/*!40000 ALTER TABLE `wallets` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-21  8:50:34
