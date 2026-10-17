
import prisma from "./lib/prisma.js";

async function main() {
  // 1. Find or create a venue
  let venue = await prisma.venue.findFirst({
    where: {
      name: "Seminar Hall A",
      building: "Main Block"
    }
  });

  if (!venue) {
    venue = await prisma.venue.create({
      data: {
        name: "Seminar Hall A",
        building: "Main Block",
        capacity: 30
      }
    });
  }

  // 2. Find or create a faculty member
  const faculty = await prisma.faculty.upsert({
    where: {
      email: "faculty1@example.com"
    },
    update: {
      fullName: "Dr. Ananya Verma"
    },
    create: {
      fullName: "Dr. Ananya Verma",
      email: "faculty1@example.com"
    }
  });

  // 3. Define the verification slot
  const startAt = new Date("2026-11-02T09:00:00+05:30");
  const endAt = new Date("2026-11-02T09:30:00+05:30");

  // 4. Check whether this slot already exists
  let slot = await prisma.slot.findFirst({
    where: {
      venueId: venue.id,
      facultyId: faculty.id,
      startAt,
      endAt
    }
  });

  // 5. Create the slot if it doesn't exist
  if (!slot) {
    slot = await prisma.slot.create({
      data: {
        startAt,
        endAt,
        capacity: 20,
        isOpen: true,
        venueId: venue.id,
        facultyId: faculty.id
      }
    });
  }

  console.log("Sample records ready!");
  console.log("Venue:", venue.name);
  console.log("Faculty:", faculty.fullName);
  console.log("Slot:", slot);
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
