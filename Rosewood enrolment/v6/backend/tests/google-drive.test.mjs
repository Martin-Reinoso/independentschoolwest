import assert from "node:assert/strict";
import test from "node:test";
import { GoogleDriveStore } from "../google-drive.mjs";
import {pdfHash} from '../offer-pdf.mjs';
import {readFileSync} from 'node:fs';

const auth = {
  authMode: "user_oauth",
  oauthClientId: "client",
  oauthClientSecret: "secret",
  oauthRefreshToken: "refresh"
};

test('acceptance PDF retrieval binds child, packet, revision, checksum and private folder',async()=>{
 const data=Buffer.from('%PDF-synthetic'),sha256=pdfHash(data),ref={offerId:'offer-synthetic',revision:3,packetHash:'packet-hash',fileId:'record-file',sha256};
 let meta={mimeType:'application/pdf',size:String(data.length),parents:['private-folder'],appProperties:{rosewoodWorkflow:'enrolment_offer',rosewoodOfferId:ref.offerId,rosewoodRevision:'3',rosewoodPacketHash:ref.packetHash,rosewoodChecksum:sha256,rosewoodArtifact:'acceptance_record'},trashed:false},content=data,reads=0;
 const store=new GoogleDriveStore({auth,applicationFolderId:'private-folder'});store.request=async url=>url.includes('alt=media')?(reads++,new Response(content)):new Response(JSON.stringify(meta));
 assert.deepEqual(await store.readOfferRecord(ref),data);
 for(const changed of [{offerId:'other-child'},{revision:2},{packetHash:'other-packet'},{sha256:'0'.repeat(64)}])await assert.rejects(()=>store.readOfferRecord({...ref,...changed}),/ownership/);
 assert.equal(reads,1);meta.parents=['public-folder'];await assert.rejects(()=>store.readOfferRecord(ref),/ownership/);assert.equal(reads,1);meta.parents=['private-folder'];
 meta.size='2000001';await assert.rejects(()=>store.readOfferRecord(ref),/ownership/);meta.size=String(data.length);
 content=Buffer.from('%PDF-tampered');await assert.rejects(()=>store.readOfferRecord(ref),/integrity/);
});

test('signature retrieval binds the exact signer and signature before image download',async()=>{
 const data=readFileSync(new URL('./fixtures/synthetic-offer-signature.png',import.meta.url)),sha256=pdfHash(data),ref={offerId:'offer-synthetic',signerId:'guardian-synthetic',signatureId:'signature-synthetic',fileId:'signature-file',sha256};let reads=0;
 const meta={mimeType:'image/png',size:String(data.length),parents:['private-folder'],appProperties:{rosewoodWorkflow:'enrolment_offer',rosewoodOfferId:ref.offerId,rosewoodSignerId:ref.signerId,rosewoodSignatureId:ref.signatureId,rosewoodChecksum:sha256,rosewoodArtifact:'signature'},trashed:false};
 const store=new GoogleDriveStore({auth,applicationFolderId:'private-folder'});store.request=async url=>url.includes('alt=media')?(reads++,new Response(data)):new Response(JSON.stringify(meta));
 assert.deepEqual(await store.readOfferSignature(ref),data);
 for(const changed of [{offerId:'other-child'},{signerId:'other-guardian'},{signatureId:'other-signature'}])await assert.rejects(()=>store.readOfferSignature({...ref,...changed}),/ownership/);
 assert.equal(reads,1);
});

test("Google Drive upload adapter supports the V6 browser upload contract", async () => {
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (String(url).includes("oauth2.googleapis.com")) {
      return new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (String(url).includes("uploadType=resumable")) {
      return new Response("{}", { status: 200, headers: { location: "https://uploads.example.invalid/session" } });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  const store = new GoogleDriveStore({ auth, eoiFolderId: "eoi-folder", applicationFolderId: "application-folder", fetchImpl });
  const result = await store.createUpload({ uploadId: "upload-1", applicationId: "app-1", category: "birth_certificate", fileName: "synthetic.pdf", mimeType: "application/pdf", size: 100, checksumSha256: "checksum" });
  assert.equal(result.uploadUrl, "https://uploads.example.invalid/session");
  assert.equal(result.documentId, "");
  assert.deepEqual(result.uploadHeaders, { "Content-Type": "application/pdf" });
  assert.equal(result.upload.storageProvider, "google_drive");
  assert.match(requests[1].options.body, /application-folder/);
});

test("Google Drive confirmation rejects metadata drift and labels accepted files accurately", async () => {
  const fetchImpl = async url => {
    if (String(url).includes("oauth2.googleapis.com")) {
      return new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ id: "drive-1", name: "app-1-birth_certificate-synthetic.pdf", mimeType: "application/pdf", size: "100", parents: ["application-folder"], appProperties: { rosewoodApplicationId: "app-1", rosewoodCategory: "birth_certificate", rosewoodExpectedMime: "application/pdf", rosewoodExpectedSize: "100" }, trashed: false, md5Checksum: "md5", createdTime: "2026-08-06T00:00:00.000Z" }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const store = new GoogleDriveStore({ auth, eoiFolderId: "eoi-folder", applicationFolderId: "application-folder", fetchImpl });
  const document = await store.confirmUpload({ applicationId: "app-1", category: "birth_certificate", documentId: "drive-1" });
  assert.equal(document.storageProvider, "google_drive");
  assert.equal(document.malwareScanStatus, "not_scanned");
  assert.equal(document.documentId, "drive-1");
});

test("Google Drive staff preview revalidates application ownership before reading bytes", async () => {
  const data = Buffer.from("%PDF-synthetic");
  const requests = [];
  const fetchImpl = async url => {
    requests.push(String(url));
    if (String(url).includes("oauth2.googleapis.com")) return new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200, headers: { "Content-Type": "application/json" } });
    if (String(url).includes("alt=media")) return new Response(data, { status: 200, headers: { "Content-Type": "application/pdf" } });
    return new Response(JSON.stringify({ id: "drive-1", name: "protected.pdf", mimeType: "application/pdf", size: String(data.length), parents: ["application-folder"], appProperties: { rosewoodApplicationId: "app-1", rosewoodCategory: "birth_certificate" }, trashed: false }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const store = new GoogleDriveStore({ auth, eoiFolderId: "eoi-folder", applicationFolderId: "application-folder", fetchImpl });
  const document = await store.readApplicationDocument({ applicationId: "app-1", category: "birth_certificate", documentId: "drive-1", expectedMimeType: "application/pdf", expectedSize: data.length, expectedFileName: "family-document.pdf" });
  assert.equal(document.fileName, "family-document.pdf");
  assert.deepEqual(document.data, data);
  assert.ok(requests.some(url => url.includes("alt=media")));
});

test("Google Drive staff preview rejects a document owned by another application", async () => {
  let mediaRequested = false;
  const fetchImpl = async url => {
    if (String(url).includes("oauth2.googleapis.com")) return new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200, headers: { "Content-Type": "application/json" } });
    if (String(url).includes("alt=media")) mediaRequested = true;
    return new Response(JSON.stringify({ id: "drive-1", name: "protected.pdf", mimeType: "application/pdf", size: "10", parents: ["application-folder"], appProperties: { rosewoodApplicationId: "different-app", rosewoodCategory: "birth_certificate" }, trashed: false }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const store = new GoogleDriveStore({ auth, eoiFolderId: "eoi-folder", applicationFolderId: "application-folder", fetchImpl });
  await assert.rejects(() => store.readApplicationDocument({ applicationId: "app-1", category: "birth_certificate", documentId: "drive-1", expectedMimeType: "application/pdf", expectedSize: 10 }), error => error.code === "DOCUMENT_MISMATCH");
  assert.equal(mediaRequested, false);
});

test("Google Drive staff preview rejects content that does not match its declared type", async () => {
  const data = Buffer.from("not-a-pdf-file");
  const fetchImpl = async url => {
    if (String(url).includes("oauth2.googleapis.com")) return new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200, headers: { "Content-Type": "application/json" } });
    if (String(url).includes("alt=media")) return new Response(data, { status: 200, headers: { "Content-Type": "application/pdf" } });
    return new Response(JSON.stringify({ id: "drive-1", name: "protected.pdf", mimeType: "application/pdf", size: String(data.length), parents: ["application-folder"], appProperties: { rosewoodApplicationId: "app-1", rosewoodCategory: "birth_certificate" }, trashed: false }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const store = new GoogleDriveStore({ auth, eoiFolderId: "eoi-folder", applicationFolderId: "application-folder", fetchImpl });
  await assert.rejects(() => store.readApplicationDocument({ applicationId: "app-1", category: "birth_certificate", documentId: "drive-1", expectedMimeType: "application/pdf", expectedSize: data.length }), error => error.code === "DOCUMENT_MISMATCH");
});

test('offer letter retrieval rejects foreign ownership, modified bytes and oversized metadata',async()=>{
 const crypto=await import('node:crypto'),data=Buffer.from('%PDF-synthetic'),sha256=crypto.createHash('sha256').update(data).digest('hex');let downloaded=0;
 const meta={mimeType:'application/pdf',size:String(data.length),parents:['application-folder'],appProperties:{rosewoodWorkflow:'enrolment_offer',rosewoodFamilyOfferId:'family-test',rosewoodArtifact:'offer_letter',rosewoodChecksum:sha256},trashed:false};
 const store=new GoogleDriveStore({auth,applicationFolderId:'application-folder'});let content=data;store.request=async url=>{if(url.includes('alt=media')){downloaded++;return new Response(content);}return new Response(JSON.stringify(meta));};
 assert.deepEqual(await store.readOfferLetter({familyId:'family-test',fileId:'private-file',sha256}),data);
 await assert.rejects(()=>store.readOfferLetter({familyId:'unrelated-family',fileId:'private-file',sha256}),/ownership/);assert.equal(downloaded,1);
 content=Buffer.from('%PDF-tampered');await assert.rejects(()=>store.readOfferLetter({familyId:'family-test',fileId:'private-file',sha256}),/integrity/);
 meta.size='2000001';await assert.rejects(()=>store.readOfferLetter({familyId:'family-test',fileId:'private-file',sha256}),/ownership/);assert.equal(downloaded,2);
});
